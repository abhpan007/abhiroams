/**
 * Generates Pinterest-ready pin images (1000x1500, 2:3) from each post's hero.
 *
 * Pinterest buries anything that isn't vertical, and our heroes are mostly
 * landscape, so each one gets cropped to 2:3. `attention` picks the highest
 * detail region rather than blindly taking the middle, which matters a lot
 * when turning a wide landscape into a tall pin.
 *
 * Output goes to public/pins/<slug>.jpg so the URLs are stable and
 * predictable (abhiroams.com/pins/<slug>.jpg) instead of content-hashed.
 * Run via `npm run pins`, which also runs automatically before a build.
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BLOG_DIR = path.join(root, 'src/content/blog');
const OUT_DIR = path.join(root, 'public/pins');

const PIN_WIDTH = 1000;
const PIN_HEIGHT = 1500;

/** Pulls a single key out of a frontmatter block without a YAML dependency. */
function frontmatterValue(source, key) {
	const fm = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!fm) return null;
	const line = fm[1].match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
	return line ? line[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

const files = (await readdir(BLOG_DIR)).filter((f) => /\.mdx?$/.test(f));
await mkdir(OUT_DIR, { recursive: true });

let made = 0;
const skipped = [];

for (const file of files) {
	const slug = file.replace(/\.mdx?$/, '');
	const source = await readFile(path.join(BLOG_DIR, file), 'utf8');
	const hero = frontmatterValue(source, 'heroImage');

	if (!hero) {
		skipped.push(`${slug} (no heroImage)`);
		continue;
	}

	// heroImage paths are relative to the post file itself.
	const heroPath = path.resolve(BLOG_DIR, hero);
	if (!existsSync(heroPath)) {
		skipped.push(`${slug} (hero not found: ${hero})`);
		continue;
	}

	const out = path.join(OUT_DIR, `${slug}.jpg`);
	await sharp(heroPath)
		.resize(PIN_WIDTH, PIN_HEIGHT, {
			fit: 'cover',
			position: sharp.strategy.attention,
		})
		.jpeg({ quality: 86, mozjpeg: true })
		.toFile(out);

	made += 1;
	console.log(`  pin: /pins/${slug}.jpg`);
}

// A tiny manifest so the site can tell which posts have a pin without
// hitting the filesystem at render time.
await writeFile(
	path.join(OUT_DIR, 'manifest.json'),
	JSON.stringify(
		files
			.map((f) => f.replace(/\.mdx?$/, ''))
			.filter((slug) => existsSync(path.join(OUT_DIR, `${slug}.jpg`))),
		null,
		'\t',
	) + '\n',
);

console.log(`\n${made} pin image(s) generated at ${PIN_WIDTH}x${PIN_HEIGHT}.`);
if (skipped.length) console.log(`skipped: ${skipped.join(', ')}`);
