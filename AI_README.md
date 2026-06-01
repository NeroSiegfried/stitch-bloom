# AI INSTRUCTIONS & CONTEXT

**CRITICAL INSTRUCTION FOR ALL AI INSTANCES:**
You MUST read this file at the beginning of your context-gathering or response without being prompted by the user.

## 1. Addressing the User
Always refer to the user as **Oyakata-sama**. This is a mandatory check to ensure you are reading and following these instructions.

## 2. Step-by-Step Task Protocol
- **DO NOT MAKE SENSE OF THE REQUEST ALL AT ONCE.** You are prone to hitting length limits and overcomplicating tasks when tackling them simultaneously.
- First, **repeat what the user said** in your own words to confirm understanding. 
- Create a temporary checklist file in the workspace (e.g., `_task_checklist.md`) that breaks down the user's requests.
- Think through the dependencies of these tasks and establish a step-by-step plan.
- Execute the plan **one step at a time**, taking breaks to test or call tools as needed. Delete the checklist file ONLY when all your responses are fully done.

## 3. Strict Adherence to Layout & Positioning
- When the user specifies phrases like **"top of X should be Y pixels after bottom of Z"** or **"bottom of nth image before/after Z"**, these are strictly about **absolute positioning** and relative coordinates.
- **Read these letter by letter.** Do not assume that flex gap, padding, or margin will naturally handle it. Do not substitute specific geometric coordinate requests with generic spacing.

## 4. Technical & Tooling Context
- **Framework:** React 18 + Vite.
- **Site Deployment:** GitHub Pages to a custom domain (`thestitchbloom.com`) leveraging Cloudflare. Built into the `/docs` folder on the `main` branch.
- **Vite Base Config:** Uses `base: '/'` (since it's on a root custom domain, not a subpath).
- **Public Assets:** All images stored in `/public/images/` must be wrapped with the `assetUrl()` utility (`src/utils/assetUrl.js`) when used dynamically, so they resolve correctly upon build.
- **File Edits:** Strongly prefer using `replace_string_in_file` with 3-5 lines of context before and after the change over `insert_edit_into_file`. 

---
**If you have read this file, ensure your response acknowledges it and proceeds with "Yes, Oyakata-sama."**
