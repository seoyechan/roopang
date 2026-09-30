# 실제 화면 디자인 수정

2026-09-30. 기준 시안: `roopang-rewards-v3.png`.

## 확인한 차이와 수정

- 단순 SVG 캐릭터를 초안처럼 누워 쉬는 괴도와 코인 통 일러스트로 교체.
- 커피·짜장면·치킨·외식 그림도 같은 스타일의 투명 이미지로 교체.
- 숫자 값이 바뀔 때 DOM을 다시 만들던 효과를 고정된 자릿수 컴포넌트로 교체. 이전 숫자와 새 숫자를 360ms 동안 전환하며 쉼표·통화 단위·소수점은 안정적으로 유지.
- 정수와 소수부를 동일한 계산 결과에서 분리해 소수점 올림 경계의 표시 불일치 방지.
- 보상 낙하 680ms, 감상 320ms, 수집함 이동 540ms. 표시가 보이지 않는 수집함으로 화면을 강제 이동하지 않음.
- 보상 애니메이션 종료/컴포넌트 정리 시 실행 중 애니메이션과 타이머를 정리.
- 모바일에서 금액과 시급/버튼을 하나의 패널로 연결하고 보상 안내를 그 아래 배치.
- 수집함은 진열 형태로 정리. 그림은 최대 3개, 실제 개수는 숫자로 표시하여 작은 화면 넘침 방지.
- PC 기록은 달력과 날짜별 상세를 나란히 배치.
- 모션 줄이기에서는 숫자·보상 이동을 생략하고 정적인 획득 그림은 표시.

## 검증

- 실제 로컬 브라우저에서 시작·종료와 5천 원/1만 원/2만 원 보상 획득 흐름 확인.
- 모바일 320px·390px, 태블릿 768px, PC 1440px 화면 확인.
- 브라우저 콘솔 오류 없음. 타입 검사·프로덕션 빌드·기존 계산 검사 통과.
- 실제 서비스 배포는 수행하지 않음.

## 이미지 자산

내장 `image_gen`으로 기존 시안을 참조해 제작. PNG의 알파 채널 확인 후 그대로 적용했으며 CSS에서 보상 시트의 네 칸을 각각 표시한다.

- [누운 괴도](../public/art/lupin-resting.png)
- [일일 보상 시트](../public/art/daily-rewards.png)

### 캐릭터 생성 프롬프트

Use case: precise-object-edit. Asset type: transparent production website hero illustration.
Use the supplied UI design as the exact visual reference for the mascot in the header. Extract and faithfully redraw ONLY the reclining lazy office thief mascot and its glass coin jar together as one clean isolated illustration. No UI, no text, no frame. Preserve the recognizable character from the reference: off-white squishy bean-shaped body reclining diagonally on its back, head to upper right, two little black shoes to lower left, one arm casually behind its head, thick black eye mask, tiny relaxed closed/sleepy eyes, small knowing smile, bright spring-green necktie resting over belly. To its right sits a glass jar full of spring-green coins and one large green won coin leaning against jar. True thick charcoal hand-inked contour lines with organic rounded shape, charming relaxed posture, clean flat fills, not mechanical SVG geometry. Same illustration style as reference with a tiny soft neutral grounding shadow only. Palette off-white #fffef8, charcoal #161916, green #44dc57. Main silhouette wide landscape about 3:2, tightly composed with 5% transparent padding. Genuinely transparent background with alpha outside artwork. Large high quality raster suitable for rendering 340x230 CSS pixels at 2x. No typography, no checkerboard baked into image, no extra characters, no 3D, no gradient. Keep character fully visible.

### 보상 시트 생성 프롬프트

Use case: precise-object-edit. Production transparent sprite atlas for 월급루팡 website. Use provided image only as visual reference for the collectible objects on the shelf. Produce a PERFECT SQUARE transparent image divided conceptually into an EXACT 2 x 2 grid of equal square cells, no visible grid lines. Each quadrant has ONE isolated illustrated object, centered exactly within its quadrant and fitting inside its central 75% with generous transparent safety margins. Top-left: spring-green takeaway coffee cup with black lid and small white oval masked-thief emblem, same as reference shelf. Top-right: a black jjajangmyeon noodle bowl with green rim and two chopsticks angled upward, delicious curled black noodles. Bottom-left: golden fried chicken in an open off-white takeaway box with a tiny black mask emblem. Bottom-right: a dinner plate containing steak and small greens, knife/fork, same outline style. All four identical visual scale, thick clean organic black outlines, flat hand-drawn illustration with minimal shading, green #44dc57 primary accent, off-white and small warm food colors. NO text or numbers, NO frame, NO UI, NO connecting objects. Do not let any artwork cross quadrant boundaries. Transparent alpha background, no opaque black/white background, no checkerboard baked in, no outer glow, no large shadows. These must be usable by clipping the four exact equal quadrants in CSS.
