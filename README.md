# CSS Rizz 🚀

**Check if your CSS has rizz** - A web application that analyzes CSS files in GitHub repositories and gives you a Gen Z rating based on web baseline data. It's giving main character energy for your CSS game.

*Does your CSS have rizz? This tool will tell you if your CSS is slaying or if it's giving basic.*

## Features 🔥

- **GitHub Repository Analysis**: Drop your GitHub repo URL and we'll handle the rest (it's giving smart)
- **CSS Feature Detection**: Automatically finds and parses CSS, SCSS, SASS, and LESS files
- **Gen Z Rating System**: Get a 1-10 rating with descriptions like "UNCANNY INCREDIBLE" or "Not It"
- **Baseline Categorization**: Classifies CSS features into four categories:
  - **Newly Available**: Modern features with good browser support (2023-2024)
  - **Widely Available**: Stable features with excellent support (2020-2022)
  - **Experimental**: Cutting-edge features with limited support (2024+)
  - **Stable**: Long-established features with universal support (Pre-2020)

## How It Works 💫

1. **Input**: Drop your GitHub repository URL (we'll auto-detect the branch, no cap)
2. **Download**: The server downloads and extracts the repository
3. **Discovery**: Finds all CSS files recursively (it's giving thorough)
4. **Analysis**: Parses CSS files to extract properties, selectors, and modern features
5. **Categorization**: Maps features against baseline data
6. **Rating**: Calculates a 1-10 rating with Gen Z descriptions
7. **Results**: Shows if your CSS is actually slaying or if it's giving basic

## Setup Instructions

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Development Mode

For development with auto-restart:
```bash
npm run dev
```

## Usage

1. Go to any GitHub repository
2. Click the green "Code" button
3. Select "Download ZIP"
4. Copy the download URL from your browser's downloads
5. Paste the URL into the CSS Baseline Analyzer
6. Click "Analyze CSS" to see the results

## Example GitHub Zip URLs

- `https://github.com/twbs/bootstrap/archive/refs/heads/main.zip`
- `https://github.com/tailwindlabs/tailwindcss/archive/refs/heads/master.zip`
- `https://github.com/microsoft/vscode/archive/refs/heads/main.zip`

## Baseline Data Categories

### Newly Available (2023-2024)
- Container queries (`@container`, `container-query`)
- New viewport units (`dvh`, `svh`, `lvh`, `dvw`, `svw`, `lvw`)
- Modern selectors (`:has()`, `:is()`, `:not()`)
- CSS functions (`clamp()`, `min()`, `max()`)
- Color features (`color-mix()`, `light-dark`)
- Animation features (`scroll-timeline`, `view-timeline`)

### Widely Available (2020-2022)
- CSS Grid and Flexbox
- Transform and filter properties
- Modern box model features
- CSS custom properties
- Modern typography features

### Experimental (2024+)
- CSS scope (`@scope`)
- Anchor positioning
- View transitions
- Trigonometric functions
- Advanced color features

### Stable (Pre-2020)
- Traditional layout properties
- Basic typography
- Classic positioning
- Legacy features with universal support

## API Endpoints

### POST /analyze
Analyzes a GitHub repository for CSS features.

**Request Body:**
```json
{
  "url": "https://github.com/user/repo/archive/refs/heads/main.zip"
}
```

**Response:**
```json
{
  "stats": {
    "newlyAvailable": 5,
    "widelyAvailable": 12,
    "experimental": 2,
    "stable": 25
  },
  "features": [
    {
      "name": "grid",
      "category": "Widely Available"
    },
    {
      "name": ":has()",
      "category": "Newly Available"
    }
  ],
  "cssFilesCount": 8,
  "totalFeatures": 44
}
```

## Technical Details

- **Frontend**: Vanilla JavaScript with modern CSS
- **Backend**: Node.js with Express
- **CSS Parsing**: PostCSS for accurate CSS parsing
- **Archive Handling**: yauzl for zip file extraction
- **File System**: Recursive CSS file discovery

## Limitations

- Only supports GitHub zip URLs
- Temporary files are cleaned up after analysis
- Large repositories may take longer to process
- Some CSS preprocessor features may not be fully detected

## Contributing

Feel free to submit issues and enhancement requests. The baseline data can be updated to reflect the latest web standards and browser support.

## License

MIT License - feel free to use this project for your own purposes.
