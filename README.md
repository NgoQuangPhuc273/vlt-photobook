# Photo Album

An interactive online photo album with page-turning effects and year-based decorations.

## Features

- Upload photos with custom dates via modal popup
- Image preview before uploading
- Automatic chronological sorting
- 4 photos per page in a grid layout
- Realistic page-turning animation
- Year-specific decorative overlays
- Photos stored in browser localStorage

## Setup

1. Add decoration images to the year folders:
   - `/decorations/2020/decoration.png`
   - `/decorations/2021/decoration.png`
   - `/decorations/2022/decoration.png`
   - `/decorations/2023/decoration.png`
   - `/decorations/2024/decoration.png`
   - `/decorations/2025/decoration.png`
   - `/decorations/2026/decoration.png`

2. Open `index.html` in a web browser

## How to Use

1. Click the "+ Add Photo" button
2. In the popup, click "Choose Photo" to select an image
3. Preview your photo
4. Select the date for that photo
5. Click "Add to Album"
6. Use "Previous" and "Next" buttons to flip through pages

## Technical Details

- Pure HTML, CSS, and JavaScript
- No external dependencies
- Uses localStorage for persistence
- CSS 3D transforms for realistic page-turning
- 4 photos per page with year headers
- Decorative overlays on each photo
