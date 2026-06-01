# Task Checklist

## What I missed from the working DOM
1. `margin-bottom: 680px` on the stage → grows the hero tall enough to show the set
2. `padding-top: 16px` on home-carousel-info → the 16px gap (already done)

## Plan
- [ ] Step 1: Add `stageRef` and `carouselSetRef` to Home.jsx
- [ ] Step 2: useLayoutEffect → measure `setEl.getBoundingClientRect().bottom - stageEl.getBoundingClientRect().top + 16` → set as stage `minHeight` inline style
- [ ] Step 3: Verify no errors, delete
