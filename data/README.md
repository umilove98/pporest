# 공공데이터 화장실 CSV

## 다운로드 방법

1. [전국공중화장실표준데이터](https://www.data.go.kr/data/15012892/standard.do) 접속
2. **파일데이터** 섹션에서 CSV 다운로드
3. 다운받은 파일 이름을 `public-restrooms.csv`로 변경
4. 이 폴더(`data/`)에 넣기

## 시드 실행

```bash
npx tsx src/lib/seed.ts
```

## CSV 컬럼 매핑

| CSV 컬럼 | DB 필드 |
|----------|---------|
| 화장실명 | name |
| 소재지도로명주소 | address |
| 소재지지번주소 | address (도로명 없을 때 fallback) |
| 위도 | lat |
| 경도 | lng |
| 남성용-장애인용대변기수 + 여성용-장애인용대변기수 | has_disabled_access |
| 기저귀교환대장소 | has_diaper_table |
| 개방시간상세 | open_hours |

## 참고

- CSV 인코딩: `cp949` (EUC-KR)
- 전국 약 45,000~50,000건
- 서울+경기만 필터링하면 약 15,000건
