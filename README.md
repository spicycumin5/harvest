# Harvest 🌱

A calm habit tracker set on a small floating island. Every habit is a plot. Show up each day and the
island's wanderer plants, waters and weeds. Miss days and the crop wilts. Keep at it for 21 days
and you bring in a harvest.

## Rules of the farm
- Each day you complete a habit, the farmer does one day's work on its plot. Day one **plows** the field, day two **plants** the seeds, and every day after that **waters** the crop. Crops take 20–42 days to ripen, depending on the crop.
- Every plot has **3 hearts**. A missed day costs one heart and lets a weed in. A completed day restores one heart and clears the weeds.
- At **0 hearts** the crop dies (for example, after three misses in a row). Clear the plot to start again from plowing.
- The first day of a cycle never counts as a miss. You can mark **yesterday** if you forgot to check in.
- You get **one rest day per rolling week** for each habit. The plot is tucked in and keeps its hearts.
- You start with carrots, sunflowers and wheat. More crops (strawberry, lavender, tomato, pumpkin, rose, cherry tree) unlock as your total tended days grow.
- Choose your land in Settings: Floating Isle, Countryside Farm, Backyard or Ocean Island.
- The sky follows the real sun where you are. By default it's estimated from your time zone; you can opt in to device location in Settings.
- All of this is calculated from your check-in history in `src/game/`. There are no cron jobs.

## Setup
1. Create a free project at [supabase.com](https://supabase.com).
2. In its **SQL editor**, run the files in `supabase/migrations/` in order (`0001_init.sql`, then `0002_themes_and_crops.sql`). You can also use the CLI: `npx supabase link` and then `npx supabase db push`.
3. In **Authentication → URL Configuration**, add your site URL (e.g. `http://localhost:5173`) to the redirect URLs.
4. Copy `.env.example` to `.env.local` and fill in the project URL and anon key.
5. Install and run the app:
   ```sh
   npm install
   npm run dev
   ```

### Local Supabase (optional, needs Docker)
```sh
npx supabase start      # prints a local URL + anon key for .env.local
```
Magic-link emails land in the local inbox at http://localhost:54324.

## Scripts
- `npm run dev`: start the dev server.
- `npm test`: run the game-engine unit tests.
- `npm run build`: type-check and build for production. The output goes to `dist/`, which you can deploy to Vercel or Netlify.

## Dev time travel
In development, add `?today=YYYY-MM-DD` to the URL to pretend it's another day, so you can watch crops grow, wilt and die. Add `?hour=18.5` to see the sky at that time of day.
