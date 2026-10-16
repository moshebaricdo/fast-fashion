I want to build a polished personal wardrobe outfit-planning app.

This is not a fashion marketplace, closet management tool, or social app. The primary job-to-be-done is: help me quickly visualize outfit combinations from clothes I already own.

Build this as a mobile-first responsive web app, with desktop behaving like a slightly expanded tablet/mobile layout, similar to Instagram’s desktop experience. Prioritize polish, visual clarity, smooth motion, and a focused user flow.

Core product concept:

The app lets me upload photos of clothing items, automatically tag them with lightweight metadata, and then use a simple OOTD shuffle tool to generate outfit combinations.

The most important screen is the OOTD / Shuffle screen.

Primary navigation:

1. OOTD

2. Inventory

3. Favorites

Do not build account settings, social features, purchase tracking, weather, laundry, cost-per-wear, calendar planning, or complex wardrobe analytics.

Data model:

Each clothing item should have:

- id

- imageUrl

- name

- category: top, bottom, shoe

- subcategory: t-shirt, tank, sweater, camp collar shirt, button-down, jeans, trousers, shorts, sweatpants, sneakers, loafers, boots, etc.

- color: black, brown, olive, sage, stone, taupe, mushroom, cream, white, blue, gray, etc.

- purpose: casual, formal, sportswear, lounge

- createdAt

Each saved outfit should have:

- id

- topItemId

- bottomItemId

- shoeItemId

- name

- purpose

- createdAt

- isFavorite

Initial categories should stay intentionally simple:

- Top

- Bottom

- Shoe

The app can support subcategories, but the outfit builder should only require one item from each of the three main categories.

OOTD / Shuffle screen:

This should be the home screen and the core experience.

Layout:

- Simple header: “Today’s Fit” or “OOTD”

- Purpose selector near the top with options: Casual, Formal, Sportswear, Lounge

- Three stacked visual cards:

  1. Top

  2. Bottom

  3. Shoe

Each card should show:

- item image

- auto-generated item name

- color + subcategory

- small shuffle button for that specific slot

- manual picker button for that slot

Primary action:

- Shuffle Fit

Secondary actions:

- Shuffle individual top

- Shuffle individual bottom

- Shuffle individual shoe

- Manually select item for a slot

Tertiary action:

- Favorite / save this fit

The interaction goal:

I should be able to generate a full outfit, then lock in or manually swap one piece without losing the rest of the outfit.

Shuffle rules:

- Only combine items that match the selected purpose.

- Casual can include normal casual pieces.

- Formal should avoid sportswear and lounge.

- Sportswear should only use sportswear-compatible items.

- Lounge should allow lounge and casual items.

- Do not mix clearly incompatible items, such as sweatpants with formal shoes or suit-like pieces with running shorts.

- Keep rules lightweight and easy to modify.

Inventory screen:

Show all items in a visual grid.

Each item card should show the image, name, category, color, and purpose.

Include:

- Add item button

- Bulk upload button

- Search

- Visual filters

Visual filters should feel tactile, not like boring dropdowns:

- Category chips with icons: Top, Bottom, Shoe

- Color swatches for color filtering

- Purpose chips: Casual, Formal, Sportswear, Lounge

- Subcategory chips

Add / Bulk Upload flow:

I want to be able to upload one or multiple item photos.

After upload, the app should generate suggested metadata:

- name

- category

- subcategory

- color

- purpose

Build the AI tagging functionality for the wardrobe app to accomplish this, but the user should be able to make edits afterwards if the AI makes a mistake.

Use the OpenAI API through a server-side route only. Do not expose the API key client-side.

Environment variable:

OPENAI_API_KEY=

Create:

- app/api/tag-clothing/route.ts

- lib/ai/tagClothing.ts

- types/wardrobe.ts updates as needed

The AI tagging flow:

1. User uploads one or more clothing photos.

2. Each image is sent to the server route.

3. The server calls the OpenAI Responses API with vision/image input.

4. The model returns structured JSON metadata.

5. The UI shows a bulk review queue where I can quickly accept or edit the suggested tags.

6. Nothing is added to inventory until I confirm/save.

Use a low-cost, fast vision-capable model suitable for lightweight image classification. Prefer something like gpt-4.1-mini or the current recommended lightweight vision model if available in the SDK/docs.

Return this exact JSON shape for each clothing item:

{

  "name": "string",

  "category": "top" | "bottom" | "shoe",

  "subcategory": "t-shirt" | "tank" | "sweater" | "camp collar shirt" | "button-down" | "jacket" | "jeans" | "trousers" | "shorts" | "sweatpants" | "sneakers" | "loafers" | "boots" | "sandals" | "other",

  "color": "black" | "brown" | "olive" | "sage" | "stone" | "taupe" | "mushroom" | "cream" | "white" | "blue" | "gray" | "green" | "beige" | "other",

  "purpose": "casual" | "formal" | "sportswear" | "lounge",

  "confidence": number

}

AI tagging rules:

- Keep naming natural and outfit-useful, not product-catalog specific.

- Examples:

  - “black rib tank”

  - “brown waffle knit tee”

  - “washed brown jeans”

  - “chunky green sneakers”

  - “stone linen shorts”

- Do not invent brands and do not include brand names.  
- Prefer simple color names from the allowed list, no need to get escoteric.

- If uncertain, choose the closest category and set confidence lower.

Prompt the model specifically to identify the item as it would be used in an outfit builder, not as an ecommerce listing.

Important:

- Include robust error handling.

- If AI tagging fails, fall back to a manual entry card in the review queue.

- Add loading states for each item in bulk upload.

- Support parallel tagging but avoid UI blocking.

- Store uploaded images locally for now using browser object URLs or local app storage suitable for the MVP.

- Keep the code structured so image storage can later move to Supabase/S3 without rewriting the UI.

Also add a small “Retag with AI” action on each inventory item and each bulk-review item.

Do not overbuild authentication, cloud sync, or advanced image storage yet. This is still a personal local-first MVP. The goal is that I can add my OpenAI API key, bulk upload clothing images, get usable tags, lightly edit them, and immediately use those items in the OOTD shuffle screen.

Bulk upload should:

- accept multiple images

- create a review queue

- show each uploaded image with suggested tags

- allow quick editing before saving all items

Favorited Fits screen:

Show saved outfits in a visual gallery.

Each outfit card should display the three item images together.

Default view shows all favorites.

Include purpose filters.

Each card should show:

- outfit name

- purpose

- top / bottom / shoe preview

- option to remove from favorites

Design direction:

The visual style should feel modern, warm, tactile, and editorial (think Cosmos, Pinterest, etc), leverage our frontend-design skill.

This is not a generic SaaS dashboards. Avoid overly colorful UI.

Use a neutral, generally white palette with some earthy accents:

- off-black

- warm cream

- mushroom

- taupe

- olive

- espresso brown

- stone

The app should feel like a personal style moodboard, not an inventory database.

Motion:

Use tasteful, polished motion referencing our emil-design-eng skill.

Important interactions:

- Shuffle should animate the cards changing, not just instantly swap.

- Individual card shuffle should animate only that card.

- Favoriting should have a small satisfying microinteraction.

- Manual picker should open as a bottom sheet on mobile and centered modal or side panel on desktop.

- Filters should have responsive chip/swatches with subtle active states.

Use Framer Motion if available.

Technical direction:

Use React / Next.js if this project is being created from scratch.

Use TypeScript.

Use a simple local data store first. LocalStorage is fine for V1.

Use clean component structure:

- components/OutfitBuilder

- components/ClothingCard

- components/ItemPicker

- components/InventoryGrid

- components/FilterBar

- components/BulkUploadReview

- components/FavoriteOutfitCard

- lib/shuffleOutfit

- lib/mockTagging

- lib/storage

- types/wardrobe

Prioritize:

1. Polished OOTD shuffle experience

2. Visual inventory

3. Bulk upload with mock tagging

4. Favorite outfits gallery

Do not overbuild.

Seed the app with example wardrobe items using earth-tone clothing similar to:

- black rib tee

- chocolate brown t-shirt

- khaki rib t-shirt

- brown waffle knit tee

- beige textured t-shirt

- sage revere collar shirt

- dark green camp collar shirt

- black rib tank

- dark brown rib tank

- washed brown straight jeans

- olive linen pants

- black linen shorts

- black swim shorts

- olive chino shorts

- stone linen shorts

- white sneakers

- beige/brown retro sneakers

- chunky green sneakers