# For Maa, With Love — push reminder upgrade

## Included
- Installable PWA frontend: `index.html`, `manifest.webmanifest`, `sw.js`, `icon.svg`
- Node push API: `server.js`, `package.json`
- Scheduled reminders in India time: 7:30 AM, 10:30 AM, 1 PM, 4:30 PM, 7:30 PM, 10:15 PM, 10:45 PM.

## Deploy frontend
Upload the four frontend files to Vercel/Netlify/static hosting. Must use HTTPS.

## Deploy API
1. Deploy this folder as a Node web service (Render is one option).
2. Build command `npm install`; start command `npm start`.
3. Generate VAPID keys with `npx web-push generate-vapid-keys`.
4. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `ALLOWED_ORIGINS` in the host's environment settings. `ALLOWED_ORIGINS` must be the exact frontend origin, e.g. `https://your-site.vercel.app`.
5. Check `https://YOUR-API/health`.

## Enable on his Android
1. Open the HTTPS frontend in Chrome.
2. Use Chrome menu → Install app / Add to Home screen.
3. Open it and scroll to Phone notifications.
4. Enter the API URL and press Enable notifications. Allow notifications.

## Important limitations
This is a starter prototype. Subscriptions are stored in memory and are lost whenever the API restarts/redeploys; a persistent database should be added before relying on it. A sleeping/free service may miss schedules. Android/browser settings, battery saver, network, and push delivery can delay notifications. Keep Android Clock alarms as backup. Never commit `.env` or expose the VAPID private key. The API's allowed-origin setting is CORS, not authentication.


## Sweet copy update
The website and server notification messages have a warmer, affectionate tone. Redeploy both frontend and backend after uploading these updated files for the new wording to appear.


## Personalisation
Website name and scheduled push copy are personalised for the nickname “Maa”, with a romantic, caring, non-guilt-inducing tone. After deploying, update both the frontend static files and the backend `server.js` to publish the new messages.


## Two-minute dinner picker
- Large recipe catalogue of dinner and oats variations.
- Monday and Thursday are vegetarian-only; other days show vegetarian and non-vegetarian choices.
- Choose a recipe, tick ingredients already at home, copy the missing-items shopping list, then reveal cooking steps.
- Daily push reminder at 6:55 PM India time asks Maa to choose dinner. Push requires the backend deployed and awake.
- Protein, calorie and cost numbers are rough estimates; actual values vary by portions, brands and local prices.
