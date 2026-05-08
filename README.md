# HOO's Dino Run

## 폴더 구조

```
dino_run/
├── index.html        # 진입점 (이걸 브라우저로 열거나 serve.py로 서빙)
├── style.css
├── game.js
├── serve.py
├── sprites/          # (선택) 픽셀아트 스프라이트 폴더 — 비어있어도 게임은 작동함
└── README.md
```

## 1. 로컬에서 실행하기

### 방법 A — 서버로 실행 (권장)
터미널에서 이 폴더로 이동 후:
```bash
python serve.py
```
브라우저에서 [http://127.0.0.1:8000](http://127.0.0.1:8000) 열기.

> 포트가 이미 쓰이고 있으면 `python serve.py 8080` 처럼 다른 포트 지정.

### 방법 B — 그냥 더블클릭
`index.html`을 더블클릭해도 대부분 작동함. 단, 일부 브라우저는 `localStorage`를
file:// 환경에서 차단하는 경우가 있어서 베스트 스코어 저장이 안 될 수 있음.

## 2. GitHub Pages 배포

1. GitHub에 새 레포지토리(예: `2d-game`) 생성
2. 이 폴더 내용물(`index.html`, `style.css`, `game.js`, `sprites/`) 전부 push
3. 레포 → Settings → Pages → Source를 `main` 브랜치 `/ (root)` 로 설정
4. `https://<your-id>.github.io/2d-game/` 로 접속

> `serve.py`는 로컬 개발용이라 GitHub Pages에서는 필요 없음. push해도 무해.

## 3. 조작법

| 동작 | 키보드 | 모바일 |
|---|---|---|
| 좌우 이동 | ← → 또는 A / D | 좌하단 ◀ ▶ 버튼 |
| 점프 (길게 누르면 더 높이) | Space / W / ↑ | 우하단 JUMP 버튼 |
| 일시정지 | P | 일시정지 버튼 |

## 4. 게임 룰

1. 알(🥚)을 전부 모으면 동굴 입구의 게이트(🦴 뼈문)가 열림.
2. 동굴에 진입하면 스테이지 클리어.
3. 공룡과 부딪치면 체력 -25, 1초간 무적. 체력 0이 되면 라이프 -1, 체크포인트에서 리스폰(시간 -5초).
4. 라이프 0 또는 시간 종료 → 실패. 베스트 스코어는 `localStorage`에 저장됨.

## 5. 첨부한 픽셀아트 스프라이트를 게임에 넣고 싶다면 (선택)

지금 코드는 **이미지가 없어도 멋진 픽셀아트로 자동 렌더링**됨. 하지만 직접 만든 스프라이트를 쓰고 싶다면:

### 5-1. 자홍색(보라색) 배경 제거

ChatGPT가 만든 스프라이트는 배경이 자홍색(`#FF00FF` 근처)이야. 그대로 쓰면
배경이 그대로 게임에 박혀서 안 됨. 둘 중 하나로 처리:

- **빠른 방법 (온라인)**: [remove.bg](https://remove.bg) 또는
  [photopea.com](https://photopea.com) → 마법봉 툴 → 자홍색 픽셀 클릭 → Delete →
  PNG로 export
- **로컬에서 일괄 처리** (Python + Pillow):
  ```python
  from PIL import Image
  im = Image.open("input.png").convert("RGBA")
  d = im.getdata()
  out = []
  for r, g, b, a in d:
      # 자홍색 계열 → 투명
      if r > 200 and b > 200 and g < 100:
          out.append((255, 255, 255, 0))
      else:
          out.append((r, g, b, a))
  im.putdata(out)
  im.save("output.png", "PNG")
  ```

### 5-2. 스프라이트시트 잘라내기

업로드한 캐릭터 시트는 한 PNG 안에 8개 포즈가 들어있음. 각 포즈를 개별 PNG로
잘라서 아래 이름으로 저장:

| 파일명 | 내용 | 어디에 쓰임 |
|---|---|---|
| `sprites/player_idle.png` | 정면 서있는 포즈 | 멈춰있을 때 |
| `sprites/player_run1.png` | 달리기 1프레임 | 이동 애니메이션 |
| `sprites/player_run2.png` | 달리기 2프레임 | 이동 애니메이션 |
| `sprites/player_jump.png` | 점프 포즈 | 공중에 있을 때 |
| `sprites/enemy1.png` | 공룡 1프레임 | 적 애니메이션 |
| `sprites/enemy2.png` | 공룡 2프레임 | 적 애니메이션 (없으면 1만 사용) |
| `sprites/egg.png` | 알 | 수집 아이템 |
| `sprites/cave.png` | 동굴 입구 | 골 지점 |
| `sprites/banner.png` | 깃발 배너 | 시작 지점 데코 |
| `sprites/torch.png` | 횃불 | 시작 지점 데코 |

> **모든 파일이 선택사항**. 없으면 procedural 픽셀아트로 자동 대체됨. 일부만 넣어도 OK.

### 5-3. 권장 사이즈 (참고)

캐릭터 ~46x60, 공룡 ~56x40, 알 ~24x28 정도가 깔끔함. 코드에서 자동으로 리사이즈해서 그림.

## 6. 디자인을 고치고 싶을 때 — 어디를 만지면 되나

| 원하는 변경 | 파일 / 위치 |
|---|---|
| 점프 높이, 이동 속도 | `game.js` 상단 `JUMP_VEL`, `MAX_RUN_SPD` |
| 난이도별 시간/적 속도 | `game.js` `DIFFICULTY` 객체 |
| 스테이지 레이아웃 (플랫폼/알/적 위치) | `game.js` `STAGES` 객체 |
| HUD/패널 색상, 폰트 | `style.css` 상단 `:root` 변수 |
| 배경 (하늘/화산/숲) | `game.js` `drawSky / drawFarBackground / drawMidBackground` |

## 7. "참조 게임처럼" 더 끌어올리고 싶다면 (다음 단계 아이디어)

- 적 종류 추가 (날아다니는 익룡 등) — `STAGES` 에 `enemies: []` 배열로 확장
- BGM (Web Audio로 루프 트랙)
- 점프/공격 동작 추가 — 캐릭터 시트에 펀치 포즈가 이미 있음
- 보스 스테이지
- 리더보드 (Firebase 같은 백엔드 필요)

문제 생기면 브라우저 개발자 도구(F12) → Console 탭에서 빨간 오류 메시지 확인.
