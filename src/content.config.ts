import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			category: z.string().optional(),
			// Optional. Posts that include this get a printable page at
			// /itineraries/<slug>/ and a listing on /itineraries/.
			// Leaving it out changes nothing about the post.
			itinerary: z
				.object({
					// Short line under the title, e.g. "7 days, Portland to Acadia".
					subtitle: z.string().optional(),
					// Reservations, rentals, anything to sort before leaving.
					essentials: z
						.array(z.object({ label: z.string(), value: z.string() }))
						.optional(),
					days: z.array(
						z.object({
							day: z.string(),
							title: z.string(),
							stops: z.array(z.string()).optional(),
							eat: z.array(z.string()).optional(),
							stay: z.string().optional(),
							tip: z.string().optional(),
						}),
					),
				})
				.optional(),
		}),
});

export const collections = { blog };
