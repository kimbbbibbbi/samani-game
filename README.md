# 차사가 오기 전에 — 사만이 본풀이 웹 게임 데모

## 실행
- `index.html` 을 그냥 더블클릭하면 폰트가 안 뜰 수 있으니, 폴더에서 `python3 -m http.server 8000` 후 http://localhost:8000 접속.
- 배포: 폴더 통째로 Netlify Drop / GitHub Pages / Vercel 에 올리면 링크가 됩니다.

## 파일
| 파일 | 하는 일 |
|---|---|
| `dialogue.js` | **모든 대사·선택지·엔딩 글·크레딧.** 팀원은 이 파일만 고치면 됨 |
| `game.js` | 장면 진행 코드. 맨 위 CONFIG(속도·점수 기준), 그림 크기, NPC 위치 |
| `style.css` | 화면 모양 (대화창, 선택지 색 등) |
| `assets/` | 그림 파일을 여기에 넣기 |

## 그림 교체: assets/ 에 같은 이름으로 넣기 (.png)
배경 (640×360, 16:9): `bg_title` `bg_house` `bg_market` `bg_forest` `bg_chasa` `bg_ledger` `bg_hell`(엔딩 B) `bg_gameover` `end_a` `end_c`
큰 원본(1280×720)은 `assets/src/` 에 보관. 대사 중 배경 바꾸기: dialogue.js 에 `["@bg", "bg_market"]`
캐릭터 (배경 투명): `char_samani` `char_wife` `char_osamani` `char_skull` `char_chasa_myeong` `char_chasa_bok` `char_chasa_nokmyeong`
NPC: `npc_child1` `npc_child2` `npc_elder1` `npc_elder2` `npc_osamani` `npc_merchant`
UI: `ui_dialog` (608×96 대화창 틀) `title_logo` / 아이콘 32×32: `icon_horse` `icon_shoes` `icon_rice`
파일이 없으면 색 네모(임시 도형)로 나옵니다. 그림 화면 크기는 game.js 의 `SPRITE` 에서 조절.

## 테스트 경로 (선함: 질문 3 + 아이 2 + 노인 2 + 대접 3 = 최대 10)
- **엔딩 A**: 어떤 점수든, 명부에서 「이름을 적는다」
- **엔딩 B**: 질문 전부 두 번째(돕지 않음), 장터 사람 모두 두 번째 선택, 대접은 맞게 → 선함 3, 명부에서 「적지 않는다」
- **엔딩 C**: 질문 전부 첫 번째(돕는 답), 장터 아이 2·노인 2 모두 첫 번째(돕는다), 대접 전부 맞게 → 선함 10, 「적지 않는다」
  - 선함 8 경계: 질문 3 + 아이 2 + 대접 3 = 8 (노인 안 돕고 대접 전부 맞히기) → C / 하나라도 놓치면 B
- **게임 오버**: 차사 대접에서 2명 이상 틀리기 (예: 셋 다 「백마」). 다시 도전하면 저승사자 장면부터, 대접 점수는 되돌아감
- 세 번 부름 : 참는다 → 참는다 → 대답한다. (틀리면 처음부터)
- 대접 정답: 명차지=백마, 복차지=짚신, 녹명차지=더운 밥

## 바로 가기 (주소 뒤에 붙이기)
`?scene=quiz|market|cutscene|chasa|ledger|gameover|ending_a|ending_b|ending_c` · `&good=8` (선함 미리 지정) · `&fast=1` (글자 즉시 표시)
예: `index.html?scene=ledger&good=8`

## 조작
클릭/Space/Enter = 다음 · 숫자키 1~3 = 선택지 · F = 전체 화면

폰트: 갈무리(Galmuri), SIL OFL 1.1 — `assets/fonts/` 에 라이선스 포함
