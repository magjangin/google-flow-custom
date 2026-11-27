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

def create_star_mask_patch(patch_shape, cx, cy, r=34, p=0.55):
    """아스트로이드(4-point star) 곡선 마스크 생성"""
    h, w = patch_shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    dist = (np.abs(xx - cx)**p + np.abs(yy - cy)**p)**(1/p)
    return (dist <= r).astype(np.uint8) * 255

def create_capsule_mask_patch(patch_shape, cx, cy, rx=28, ry=18):
    """타원형 AI 캡슐 마스크 생성"""
    h, w = patch_shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.ellipse(mask, (int(cx), int(cy)), (int(rx), int(ry)), 0, 0, 360, 255, -1)
    return mask

def detect_and_create_watermark_mask(img):
    """
    이미지 해상도에 맞춰 우하단 워터마크 영역을 분석하고 마스크를 생성합니다.
    - 해상도 1376x768 또는 유사 와이드/정사각형 기준
    - 패턴 1: 단독 별 중심 (w - 93, h - 93)
    - 패턴 2: 별 (w - 128, h - 128) + AI 캡슐 (w - 50, h - 45)
    """
    h, w = img.shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)

    # 우하단 200x200 영역 추출
    patch_size = 200
    if h < patch_size or w < patch_size:
        patch_size = min(h, w)
    
    x0 = w - patch_size
    y0 = h - patch_size
    patch = img[y0:h, x0:w]
    patch_gray = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY)

    # 별 템플릿 (중심 35, 35, 크기 70x70)
    tpl_size = 70
    tpl_center = 35
    tpl = create_star_mask_patch((tpl_size, tpl_size), tpl_center, tpl_center, r=34, p=0.55)
    tpl_edge = cv2.Canny(tpl, 50, 150)

    # 1. 단독 별 위치: 패치 기준 cx1 = patch_size - 93, cy1 = patch_size - 93
    cx1 = patch_size - 93
    cy1 = patch_size - 93
    
    # 2. 복합 워터마크 별 위치: 패치 기준 cx2 = patch_size - 128, cy2 = patch_size - 128
    cx2 = patch_size - 128
    cy2 = patch_size - 128

    # 3. AI 캡슐 위치: 패치 기준 cx_ai = patch_size - 50, cy_ai = patch_size - 45
    cx_ai = patch_size - 50
    cy_ai = patch_size - 45

    # 에지 템플릿 정규화 매칭
    patch_edge = cv2.Canny(patch_gray, 50, 150)
    res = cv2.matchTemplate(patch_edge, tpl_edge, cv2.TM_CCORR_NORMED)

    # 1. 단독 별 위치 (중심: patch_size - 93, patch_size - 93)
    tl1_x = max(0, cx1 - tpl_center)
    tl1_y = max(0, cy1 - tpl_center)
    val1 = np.max(res[max(0, tl1_y - 10):min(res.shape[0], tl1_y + 10),
                      max(0, tl1_x - 10):min(res.shape[1], tl1_x + 10)]) if res.size > 0 else 0

    # 2. 복합 별 위치 (중심: patch_size - 128, patch_size - 128)
    tl2_x = max(0, cx2 - tpl_center)
    tl2_y = max(0, cy2 - tpl_center)
    val2 = np.max(res[max(0, tl2_y - 10):min(res.shape[0], tl2_y + 10),
                      max(0, tl2_x - 10):min(res.shape[1], tl2_x + 10)]) if res.size > 0 else 0

    patch_mask = np.zeros((patch_size, patch_size), dtype=np.uint8)
    detected_type = "none"

    # 복합 워터마크 여부 판단: val2가 val1보다 유의미하게 크거나(예: val2 > 0.25 and val2 > val1 * 1.5)
    if val2 > 0.25 and val2 > val1 * 1.5:
        detected_type = "star_and_ai"
        star_m = create_star_mask_patch((patch_size, patch_size), cx2, cy2, r=34, p=0.55)
        ai_m = create_capsule_mask_patch((patch_size, patch_size), cx_ai, cy_ai, rx=28, ry=18)
        patch_mask = cv2.bitwise_or(star_m, ai_m)
    else:
        # 단독 별 워터마크 적용
        detected_type = "single_star"
        patch_mask = create_star_mask_patch((patch_size, patch_size), cx1, cy1, r=34, p=0.55)

    # 2px dilation으로 경계 안티에일리어싱 완벽 커버
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    patch_mask = cv2.dilate(patch_mask, kernel, iterations=1)

    mask[y0:h, x0:w] = patch_mask
    return mask, detected_type

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

    # cv2.INPAINT_TELEA 적용
    restored = cv2.inpaint(img, mask, 3, cv2.INPAINT_TELEA)

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
