const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const yauzl = require('yauzl');
const fs = require('fs');
const path = require('path');
const { parse } = require('postcss');
const valueParser = require('postcss-value-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || '50mb';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Baseline data for CSS features
const baselineData = {
    // Newly Available (2023-2024) - Less than 2 years, good browser support
    newlyAvailable: [
        'container', 'container-name', 'container-type', 'container-query', '@container',
        'subgrid', 'dvh', 'svh', 'lvh', 'dvw', 'svw', 'lvw', 'vi', 'vb',
        'color-mix', 'relative-color-syntax', 'light-dark',
        'text-wrap', 'wrap-before', 'wrap-after', 'wrap-inside',
        'scroll-timeline', 'view-timeline', 'animation-timeline',
        'anchor', 'anchor-name', 'anchor-scope', '@position-try',
        'has()', ':has()', 'not()', ':not()', 'is()', ':is()',
        'clamp', 'max', 'min', 'abs', 'sign', 'mod', 'rem',
        'accent-color', 'color-scheme', 'forced-color-adjust',
        'scroll-behavior', 'scroll-snap-type', 'scroll-snap-align',
        'backdrop-filter', 'clip-path', 'mask', 'mask-image'
    ],
    
    // Widely Available (2020-2022) - Good browser support, stable
    widelyAvailable: [
        'grid', 'flex', 'grid-template-areas', 'grid-area', 'grid-column', 'grid-row',
        'transform', 'transform-origin', 'transform-style', 'perspective',
        'filter', 'blur', 'brightness', 'contrast', 'grayscale', 'hue-rotate',
        'box-shadow', 'text-shadow', 'border-radius', 'border-image',
        'transition', 'animation', '@keyframes', 'animation-delay',
        'opacity', 'visibility', 'display', 'position', 'z-index',
        'margin', 'padding', 'border', 'outline', 'width', 'height',
        'font-family', 'font-size', 'font-weight', 'line-height',
        'color', 'background', 'background-color', 'background-image',
        'cursor', 'pointer-events', 'user-select', 'resize',
        'overflow', 'white-space', 'text-overflow', 'word-wrap',
        'box-sizing', 'calc', 'var', 'custom-properties'
    ],
    
    // Experimental (2024+) - Very new, limited support
    experimental: [
        '@scope', 'scope', 'scope-start', 'scope-end',
        'anchor-position', 'position-anchor', 'inset-area',
        'linear', 'radial', 'conic', 'color-mix',
        'scroll-driven-animations', 'scroll-timeline-axis',
        'view-transition', 'view-transition-name',
        'popover', 'anchor', 'anchor-element',
        'trigonometric-functions', 'sin', 'cos', 'tan',
        'logarithmic-functions', 'log', 'pow', 'sqrt',
        'color-contrast', 'color-adjust', 'color-scheme'
    ],
    
    // Stable (Pre-2020) - Long-established, universal support
    stable: [
        'float', 'clear', 'display', 'position', 'top', 'right', 'bottom', 'left',
        'margin', 'padding', 'border', 'outline', 'width', 'height', 'max-width', 'min-width',
        'font', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-align',
        'color', 'background', 'background-color', 'background-image', 'background-repeat',
        'text-decoration', 'text-transform', 'letter-spacing', 'word-spacing',
        'list-style', 'table-layout', 'border-collapse', 'caption-side',
        'cursor', 'outline', 'visibility', 'overflow', 'clip', 'vertical-align',
        'white-space', 'word-wrap', 'text-indent', 'line-height'
    ]
};

// Function to download file from URL
async function downloadFile(url, filepath) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    fs.writeFileSync(filepath, buffer);
    return filepath;
}

// Function to extract zip file
function extractZip(zipPath, extractPath) {
    return new Promise((resolve, reject) => {
        yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
            if (err) return reject(err);
            
            const extractedFiles = [];
            
            zipfile.readEntry();
            zipfile.on('entry', (entry) => {
                if (/\/$/.test(entry.fileName)) {
                    // Directory entry
                    zipfile.readEntry();
                } else {
                    // File entry
                    zipfile.openReadStream(entry, (err, readStream) => {
                        if (err) return reject(err);
                        
                        const fullPath = path.join(extractPath, entry.fileName);
                        const dir = path.dirname(fullPath);
                        
                        // Create directory if it doesn't exist
                        if (!fs.existsSync(dir)) {
                            fs.mkdirSync(dir, { recursive: true });
                        }
                        
                        const writeStream = fs.createWriteStream(fullPath);
                        readStream.pipe(writeStream);
                        
                        writeStream.on('close', () => {
                            extractedFiles.push(fullPath);
                            zipfile.readEntry();
                        });
                        
                        writeStream.on('error', reject);
                    });
                }
            });
            
            zipfile.on('end', () => {
                resolve(extractedFiles);
            });
            
            zipfile.on('error', reject);
        });
    });
}

// Function to find CSS files recursively
function findCSSFiles(dir, cssFiles = []) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            // Skip common directories that don't contain CSS
            if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(file)) {
                findCSSFiles(fullPath, cssFiles);
            }
        } else if (file.endsWith('.css') || file.endsWith('.scss') || file.endsWith('.sass') || file.endsWith('.less')) {
            cssFiles.push(fullPath);
        }
    }
    
    return cssFiles;
}

// Function to parse CSS and extract features
function analyzeCSSFile(filePath) {
    try {
        const cssContent = fs.readFileSync(filePath, 'utf8');
        const root = parse(cssContent);
        const features = new Set();
        
        root.walkRules((rule) => {
            // Extract selectors
            if (rule.selector) {
                const selector = rule.selector;
                
                // Check for modern selectors
                if (selector.includes(':has(')) features.add(':has()');
                if (selector.includes(':not(')) features.add(':not()');
                if (selector.includes(':is(')) features.add(':is()');
                if (selector.includes('@container')) features.add('@container');
                if (selector.includes('@scope')) features.add('@scope');
            }
            
            // Extract properties
            rule.walkDecls((decl) => {
                const prop = decl.prop;
                const value = decl.value;
                
                features.add(prop);
                
                // Check for modern values
                if (value.includes('clamp(')) features.add('clamp()');
                if (value.includes('min(')) features.add('min()');
                if (value.includes('max(')) features.add('max()');
                if (value.includes('color-mix(')) features.add('color-mix()');
                if (value.includes('dvh')) features.add('dvh');
                if (value.includes('svh')) features.add('svh');
                if (value.includes('lvh')) features.add('lvh');
                if (value.includes('dvw')) features.add('dvw');
                if (value.includes('svw')) features.add('svw');
                if (value.includes('lvw')) features.add('lvw');
                if (value.includes('container-query')) features.add('container-query');
                if (value.includes('subgrid')) features.add('subgrid');
                if (value.includes('backdrop-filter')) features.add('backdrop-filter');
                if (value.includes('scroll-timeline')) features.add('scroll-timeline');
                if (value.includes('view-timeline')) features.add('view-timeline');
                if (value.includes('anchor')) features.add('anchor');
                if (value.includes('light-dark')) features.add('light-dark');
            });
        });
        
        root.walkAtRules((atRule) => {
            if (atRule.name === 'container') features.add('@container');
            if (atRule.name === 'scope') features.add('@scope');
            if (atRule.name === 'keyframes') features.add('@keyframes');
        });
        
        return Array.from(features);
    } catch (error) {
        console.error(`Error parsing CSS file ${filePath}:`, error);
        return [];
    }
}

// Function to categorize features based on baseline data
function categorizeFeatures(features) {
    const categorized = {
        newlyAvailable: [],
        widelyAvailable: [],
        experimental: [],
        stable: []
    };
    
    features.forEach(feature => {
        // Check each category
        if (baselineData.newlyAvailable.some(f => feature.includes(f) || f.includes(feature))) {
            categorized.newlyAvailable.push(feature);
        } else if (baselineData.widelyAvailable.some(f => feature.includes(f) || f.includes(feature))) {
            categorized.widelyAvailable.push(feature);
        } else if (baselineData.experimental.some(f => feature.includes(f) || f.includes(feature))) {
            categorized.experimental.push(feature);
        } else if (baselineData.stable.some(f => feature.includes(f) || f.includes(feature))) {
            categorized.stable.push(feature);
        } else {
            // Default to stable for unknown features
            categorized.stable.push(feature);
        }
    });
    
    return categorized;
}

// Function to detect GitHub repository info and get default branch
async function getGitHubRepoInfo(repoUrl) {
    try {
        // Extract owner and repo name from various GitHub URL formats
        let owner, repo;
        
        // Handle different URL formats
        if (repoUrl.includes('github.com')) {
            const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/)?$/);
            if (match) {
                owner = match[1];
                repo = match[2];
            }
        }
        
        if (!owner || !repo) {
            throw new Error('Invalid GitHub repository URL');
        }
        
        // Use GitHub API to get repository info (no auth required for public repos)
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Repository not found or is private');
            }
            throw new Error(`GitHub API error: ${response.statusText}`);
        }
        
        const repoData = await response.json();
        const defaultBranch = repoData.default_branch;
        
        // Construct archive URL
        const archiveUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${defaultBranch}.zip`;
        
        return {
            owner,
            repo,
            defaultBranch,
            archiveUrl,
            repoData
        };
    } catch (error) {
        throw new Error(`Failed to get repository info: ${error.message}`);
    }
}

// Function to validate and convert GitHub URL to archive URL
async function convertToArchiveUrl(url) {
    // If it's already an archive URL, return as-is
    if (url.includes('/archive/refs/heads/') && url.endsWith('.zip')) {
        return url;
    }
    
    // If it's a regular GitHub URL, get the default branch and convert
    if (url.includes('github.com')) {
        const repoInfo = await getGitHubRepoInfo(url);
        return repoInfo.archiveUrl;
    }
    
    throw new Error('URL must be a GitHub repository URL or GitHub archive URL');
}

// Main analysis endpoint
app.post('/analyze', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'GitHub URL is required' });
    }
    
    let archiveUrl;
    let repoInfo = null;
    
    try {
        // Convert the URL to an archive URL
        archiveUrl = await convertToArchiveUrl(url);
        
        // Try to get repository info for better error messages
        if (!url.includes('/archive/refs/heads/')) {
            repoInfo = await getGitHubRepoInfo(url);
        }
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
    
    const tempDir = path.join(__dirname, 'temp');
    const zipPath = path.join(tempDir, 'repo.zip');
    
    try {
        // Create temp directory
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Download the zip file
        console.log(`Downloading repository from: ${archiveUrl}`);
        await downloadFile(archiveUrl, zipPath);
        
        // Extract the zip file
        console.log('Extracting repository...');
        const extractPath = path.join(tempDir, 'extracted');
        if (!fs.existsSync(extractPath)) {
            fs.mkdirSync(extractPath, { recursive: true });
        }
        
        const extractedFiles = await extractZip(zipPath, extractPath);
        
        // Find CSS files
        console.log('Finding CSS files...');
        const cssFiles = findCSSFiles(extractPath);
        
        if (cssFiles.length === 0) {
            return res.json({
                stats: { newlyAvailable: 0, widelyAvailable: 0, experimental: 0, stable: 0 },
                features: [],
                message: 'No CSS files found in the repository'
            });
        }
        
        // Analyze CSS files
        console.log(`Analyzing ${cssFiles.length} CSS files...`);
        const allFeatures = new Set();
        
        cssFiles.forEach(cssFile => {
            const features = analyzeCSSFile(cssFile);
            features.forEach(feature => allFeatures.add(feature));
        });
        
        // Categorize features
        const categorized = categorizeFeatures(Array.from(allFeatures));
        
        // Prepare response
        const stats = {
            newlyAvailable: categorized.newlyAvailable.length,
            widelyAvailable: categorized.widelyAvailable.length,
            experimental: categorized.experimental.length,
            stable: categorized.stable.length
        };
        
        const features = [
            ...categorized.newlyAvailable.map(f => ({ name: f, category: 'Newly Available' })),
            ...categorized.widelyAvailable.map(f => ({ name: f, category: 'Widely Available' })),
            ...categorized.experimental.map(f => ({ name: f, category: 'Experimental' })),
            ...categorized.stable.map(f => ({ name: f, category: 'Stable' }))
        ];
        
        res.json({
            stats,
            features,
            cssFilesCount: cssFiles.length,
            totalFeatures: allFeatures.size,
            repositoryInfo: repoInfo ? {
                name: repoInfo.repo,
                owner: repoInfo.owner,
                defaultBranch: repoInfo.defaultBranch,
                url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}`
            } : null
        });
        
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        // Clean up temp files
        try {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
        }
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`CSS Baseline Analyzer running on http://localhost:${PORT}`);
});
