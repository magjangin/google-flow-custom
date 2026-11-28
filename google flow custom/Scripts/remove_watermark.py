#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Google Flow / Imagen 생성 이미지 워터마크 자동 감지 & 인페인팅 복원 스크립트
우하단 구석의 Google DeepMind 4-point star(별) 및 AI 캡슐 워터마크를 정밀하게 찾아
OpenCV cv2.inpaint(TELEA)로 원본 디테일을 손상 없이 자연스럽게 복원합니다.
"""

import sys
import os
import argparse
import glob
from pathlib import Path
import cv2
import numpy as np

# ---------------------------------------------------------------------------
# 워터마크 감지 (2026-11-28 재작성)
#
# 실측 샘플 41장(Flow 프로젝트 7개에서 받은 원본)으로 확인한 사실 — 기준 가로 1376px:
#   - 별(4-point astroid, r≈32)은 두 고정 위치 중 하나: 단독 (w-97, h-97) / AI 캡슐과 함께일 때 (w-129, h-129)
#   - "AI" 캡슐은 (w-57, h-50), 약 48x32. 별 없이 캡슐만 붙는 이미지도 있다(Nano Banana 2.1).
#   - 워터마크가 아예 안 보이는 이미지도 많다(흰 배경, 어두운 영상 프레임 등).
#   - 다른 크기(예: 512x288 썸네일)는 가로 비율로 위치·크기가 그대로 줄어든다.
# 예전 방식(밝기 > 120이면 AI 캡슐로 판정, 별은 무조건 칠함)은 밝은 배경에서 거의 항상 오감지해
# 원본 글자(예: "Official Soundtrack")를 지웠다. 그래서 요소마다 따로, 고정 위치에서만, 하이패스
# 밝기 상관으로 판정하고 찾은 요소만 칠한다. 아무것도 못 찾으면 이미지를 건드리지 않는다.
# ---------------------------------------------------------------------------

BASE_W = 1376.0
STAR_R = 32
STAR_P = 0.55
STAR_SPOTS = {"star": (97, 97), "star_with_ai": (129, 129)}
CAPSULE_SPOT = (57, 50)
CAPSULE_HALF = (25, 17)  # 캡슐 반폭/반높이(기준 크기)
SEARCH = 6               # 고정 위치 주변 탐색 반경(기준 px)
STAR_STRONG = 0.45       # 이 이상이면 위치 오차와 상관없이 별로 판정
STAR_WEAK = 0.16         # 이 이상이면서 위치 오차 ≤ 2px면 별로 판정(네온 글자 위 등 복잡한 배경의 별). 워터마크 없는 샘플의 최대가 0.14
CAPSULE_MIN = 0.5
FLAT_STD = 1.5           # 이보다 평평한 영역(흰 배경 등)은 상관 판정을 하지 않음
# 흰색처럼 평평한 배경 위의 별은 안쪽이 배경과 같고 반지름 33~35 테두리만 2px 정도 살짝 어둡다(실측 -3~-4).
# 그래서 상관 대신 "그 고리가 한 바퀴 내내 어두운가"를 본다. 복잡한 배경에서는 쓰지 않음(점·글자에 속기 쉬움).
RING_BG_STD_MAX = 5.0    # 고리 안/밖 배경의 표준편차가 이 이하일 때만
RING_MEDIAN_MAX = -2.0   # 고리 밝기 − 배경 중앙값의 중앙값
RING_FRAC_MIN = 0.5      # 고리 픽셀 중 배경보다 1 이상 어두운 비율

_TPL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wm_templates")


def _highpass(img):
    L = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)[:, :, 0].astype(np.float32)
    return L - cv2.GaussianBlur(L, (0, 0), 9)


def _star_template(r, pad=6):
    s = 2 * (r + pad) + 1
    yy, xx = np.mgrid[0:s, 0:s] - (r + pad)
    d = (np.abs(xx) ** STAR_P + np.abs(yy) ** STAR_P) ** (1 / STAR_P)
    return (d <= r).astype(np.float32)


def _capsule_template():
    t = cv2.imread(os.path.join(_TPL_DIR, "ai_capsule_hp.png"), cv2.IMREAD_GRAYSCALE)
    if t is None:
        raise FileNotFoundError("wm_templates/ai_capsule_hp.png 가 없습니다.")
    return t.astype(np.float32)


def _score_at(hp, tpl, cx, cy, search):
    """(cx, cy) 주변 ±search 안에서 템플릿 최대 상관값, 그 위치의 중심 오프셋, 창의 표준편차"""
    th, tw = tpl.shape
    x0 = int(round(cx - tw / 2 - search))
    y0 = int(round(cy - th / 2 - search))
    x1, y1 = x0 + tw + 2 * search, y0 + th + 2 * search
    H, W = hp.shape
    if x0 < 0 or y0 < 0 or x1 > W or y1 > H:
        return -1.0, (0, 0), 0.0
    win = hp[y0:y1, x0:x1]
    t = (tpl - tpl.mean()).astype(np.float32)
    res = cv2.matchTemplate(win, t, cv2.TM_CCOEFF_NORMED)
    _, mx, _, loc = cv2.minMaxLoc(res)
    return float(mx), (loc[0] - search, loc[1] - search), float(win.std())


def _ring_outline_star(L, cx, cy, s):
    """평평한 배경 위 '테두리만 보이는' 별 판정. (판정, 정보) 반환"""
    h, w = L.shape
    R = int(60 * s) + 2
    x0, y0 = int(cx) - R, int(cy) - R
    if x0 < 0 or y0 < 0 or x0 + 2 * R + 1 > w or y0 + 2 * R + 1 > h:
        return False, {}
    win = L[y0:y0 + 2 * R + 1, x0:x0 + 2 * R + 1]
    yy, xx = np.mgrid[0:win.shape[0], 0:win.shape[1]]
    d = (np.abs(xx + x0 - cx) ** STAR_P + np.abs(yy + y0 - cy) ** STAR_P) ** (1 / STAR_P) / s
    ring = (d >= 32.5) & (d < 35.5)
    around = np.concatenate([win[(d >= 22) & (d < 30)], win[(d >= 38) & (d < 46)]])
    bg_sd = float(around.std())
    diff = win[ring] - np.median(around)
    med, frac = float(np.median(diff)), float((diff < -1.0).mean())
    ok = bg_sd <= RING_BG_STD_MAX and med <= RING_MEDIAN_MAX and frac >= RING_FRAC_MIN
    return ok, {"ring_median": round(med, 2), "ring_frac": round(frac, 2), "bg_std": round(bg_sd, 2)}


def detect_watermarks(img):
    """찾은 워터마크 요소 목록. 요소: {kind, cx, cy, score, ...}"""
    h, w = img.shape[:2]
    s = w / BASE_W
    hp = _highpass(img)
    L = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)[:, :, 0].astype(np.float32)
    search = max(2, int(round(SEARCH * s)))
    found = []

    star = cv2.resize(_star_template(STAR_R), None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    # 두 별 위치는 따로 판정한다(한 이미지에 둘 다 찍힌 사례 있음: p5_03)
    for kind, (dx, dy) in STAR_SPOTS.items():
        cx, cy = w - dx * s, h - dy * s
        sc, (ox, oy), sd = _score_at(hp, star, cx, cy, search)
        exact = abs(ox) <= 2 and abs(oy) <= 2
        if sd >= FLAT_STD and (sc >= STAR_STRONG or (sc >= STAR_WEAK and exact)):
            found.append({"kind": kind, "cx": cx + ox, "cy": cy + oy, "r": STAR_R * s, "score": round(sc, 3)})
            continue
        ok, info = _ring_outline_star(L, cx, cy, s)
        if ok:  # 흰 배경 등: 테두리만 보이는 별 (2026-11-28 드림모드 실측)
            found.append({"kind": kind, "cx": cx, "cy": cy, "r": STAR_R * s, "score": "ring", "outline": True, **info})

    cap = _capsule_template()
    cap = cv2.resize(cap, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    cx, cy = w - CAPSULE_SPOT[0] * s, h - CAPSULE_SPOT[1] * s
    sc, (ox, oy), sd = _score_at(hp, cap, cx, cy, search)
    if sd >= FLAT_STD and sc >= CAPSULE_MIN:
        found.append({"kind": "ai_capsule", "cx": cx + ox, "cy": cy + oy,
                      "rx": CAPSULE_HALF[0] * s, "ry": CAPSULE_HALF[1] * s, "score": round(sc, 3)})
    return found


def _mask_for(img, found):
    h, w = img.shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)
    for f in found:
        if f["kind"].startswith("star"):
            r = f["r"] + (4 * f["r"] / STAR_R if f.get("outline") else 2)  # 테두리형은 고리(33~35)까지 덮도록
            yy, xx = np.mgrid[0:h, 0:w]
            d = (np.abs(xx - f["cx"]) ** STAR_P + np.abs(yy - f["cy"]) ** STAR_P) ** (1 / STAR_P)
            mask[d <= r] = 255
        else:
            rx, ry = int(round(f["rx"])), int(round(f["ry"]))
            cx, cy = int(round(f["cx"])), int(round(f["cy"]))
            cv2.rectangle(mask, (cx - rx + ry, cy - ry), (cx + rx - ry, cy + ry), 255, -1)
            cv2.circle(mask, (cx - rx + ry, cy), ry, 255, -1)
            cv2.circle(mask, (cx + rx - ry, cy), ry, 255, -1)
    if mask.any():
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.dilate(mask, kernel, iterations=1)
    return mask


def detect_and_create_watermark_mask(img):
    """
    (mask, detected_type) — 하위 호환용. detected_type:
      "none" | "single_star" | "star_and_ai" | "ai_only" | "two_stars" | "star_with_ai_spot"(캡슐은 안 보이고 별만 129 위치)
    """
    found = detect_watermarks(img)
    kinds = {f["kind"] for f in found}
    has_star = bool(kinds & {"star", "star_with_ai"})
    if not found:
        t = "none"
    elif has_star and "ai_capsule" in kinds:
        t = "star_and_ai"
    elif "ai_capsule" in kinds:
        t = "ai_only"
    elif kinds == {"star", "star_with_ai"}:
        t = "two_stars"
    elif "star_with_ai" in kinds:
        t = "star_with_ai_spot"
    else:
        t = "single_star"
    return _mask_for(img, found), t


def remove_watermark_from_image(input_path, output_path=None, delete_original=False):
    """
    단일 이미지 파일의 워터마크를 제거하고 결과를 저장합니다.
    delete_original=True일 경우 워터마크가 있는 원본 사진을 삭제합니다.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"파일을 찾을 수 없습니다: {input_path}")

    # 한글 경로 지원을 위해 np.fromfile 사용
    img_data = np.fromfile(input_path, dtype=np.uint8)
    img = cv2.imdecode(img_data, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"이미지를 디코딩할 수 없습니다: {input_path}")

    mask, detected_type = detect_and_create_watermark_mask(img)

    # 워터마크가 없으면 픽셀을 건드리지 않는다(원본 그대로 저장/유지)
    restored = img if detected_type == "none" else cv2.inpaint(img, mask, 3, cv2.INPAINT_TELEA)

    # 저장 경로 결정
    if output_path is None:
        if delete_original:
            output_path = input_path
        else:
            p = Path(input_path)
            output_path = str(p.parent / f"{p.stem}_clean{p.suffix}")

    # 임시 파일로 저장 후 원본 교체 또는 저장
    ext = os.path.splitext(output_path)[1]
    is_success, encoded_img = cv2.imencode(ext if ext else ".png", restored)
    if not is_success:
        raise RuntimeError("이미지 인코딩에 실패했습니다.")

    # 원본 파일 교체 모드인 경우
    if os.path.abspath(input_path) == os.path.abspath(output_path):
        temp_out = input_path + ".tmp.png"
        with open(temp_out, "wb") as f:
            encoded_img.tofile(f)
        try:
            os.remove(input_path)
        except Exception:
            pass
        os.replace(temp_out, output_path)
    else:
        with open(output_path, "wb") as f:
            encoded_img.tofile(f)
        if delete_original and os.path.exists(input_path):
            try:
                os.remove(input_path)
            except Exception as e:
                print(f"원본 파일 삭제 실패: {e}", file=sys.stderr)

    return {
        "status": "success",
        "input": input_path,
        "output": output_path,
        "detected_type": detected_type,
        "original_deleted": delete_original
    }

def process_directory(dir_path, delete_original=False, pattern="*.*"):
    """디렉토리 내 모든 이미지 일괄 워터마크 인페인팅 복원"""
    valid_exts = {".png", ".jpg", ".jpeg", ".webp"}
    results = []
    
    # glob으로 탐색
    for root, _, files in os.walk(dir_path):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in valid_exts and not file.endswith("_clean.png"):
                full_path = os.path.join(root, file)
                try:
                    res = remove_watermark_from_image(full_path, delete_original=delete_original)
                    results.append(res)
                except Exception as e:
                    results.append({"status": "error", "file": full_path, "error": str(e)})

    return results

def main():
    parser = argparse.ArgumentParser(description="Google Flow 이미지 워터마크 제거 인페인팅 도구")
    parser.add_argument("--file", "-f", help="처리할 단일 이미지 파일 경로")
    parser.add_argument("--dir", "-d", help="처리할 디렉토리 경로")
    parser.add_argument("--out", "-o", help="출력 파일 경로 (생략 시 원본 대체 또는 _clean 접미사)")
    parser.add_argument("--delete-original", action="store_true", default=False, help="워터마크가 있는 원본 사진 삭제")
    parser.add_argument("--replace", action="store_true", default=False, help="원본 파일을 복원된 이미지로 직접 교체")

    args = parser.parse_args()

    delete_orig = args.delete_original or args.replace

    if args.file:
        res = remove_watermark_from_image(args.file, output_path=args.out, delete_original=delete_orig)
        import json
        print(json.dumps(res, ensure_ascii=False, indent=2))
    elif args.dir:
        res_list = process_directory(args.dir, delete_original=delete_orig)
        import json
        print(json.dumps({"processed_count": len(res_list), "results": res_list}, ensure_ascii=False, indent=2))
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
