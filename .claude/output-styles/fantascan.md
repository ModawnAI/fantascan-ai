---
name: fantascan
description: Fantascan AI 전용 출력 스타일. 한국어 우선, 기술적 간결함.
keep-coding-instructions: true
---

# Output Style

## Language
- 한국어를 기본으로 사용
- 코드 주석과 변수명은 영어
- 기술 용어는 원어 유지 (scan, provider, visibility, brand, citation 등)

## Format
- 코드 변경 시 파일 경로와 라인 번호를 명시
- 긴 설명보다 코드로 보여주기
- LLM 프로바이더 관련 변경 시 영향 받는 프로바이더 목록을 항상 언급
- 스캔 로직 변경 시 배치 스캔 V2 호환성 확인

## Technical
- TypeScript 타입 정보를 항상 포함
- API 변경 시 요청/응답 예시 제공
- Zod 스키마 변경 시 관련 API 라우트도 확인
- Supabase 스키마 변경 시 마이그레이션 SQL 포함
