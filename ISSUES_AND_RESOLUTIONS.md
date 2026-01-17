# Project Issues and Resolutions

## Summary
This document lists all identified issues in the project and provides step-by-step resolutions.

---

## Critical Issues (Must Fix)

### 1. **Missing Package Import - Unused Import from Non-existent Package**
**Location:** `lib/pipeline.ts` (line 6)
**Issue:** The code imports `GoogleAIFileManager` and `FileState` from `@google/generative-ai/server`, but:
- The package is not installed in `package.json`
- The imports are never used in the code

**Resolution:**
- Remove the unused import from `lib/pipeline.ts`
- The code currently uses inline base64 encoding which works fine

**Fix:**
```typescript
// Remove line 6:
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
```

---

### 2. **Missing Prisma Generate Script**
**Location:** `package.json`
**Issue:** No script to generate Prisma Client after schema changes. This will cause runtime errors when Prisma Client is not generated.

**Resolution:**
Add a `postinstall` script to automatically generate Prisma Client after `npm install`, or add a separate `prisma:generate` script.

**Fix:**
Update `package.json` scripts section:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "postinstall": "prisma generate",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:push": "prisma db push"
}
```

---

### 3. **Unused OpenAI Module and Dependency**
**Location:** `lib/openai.ts`, `package.json` (line 17)
**Issue:** 
- The `openai` package is installed but never used in the codebase
- The project uses Gemini API instead
- `lib/openai.ts` is created but never imported anywhere

**Resolution:**
**Option A (Recommended):** Remove unused code
- Delete `lib/openai.ts`
- Remove `openai` from `package.json` dependencies

**Option B:** Keep for future use (if you plan to use OpenAI)

**Fix (Option A):**
1. Delete `lib/openai.ts`
2. Remove from `package.json`:
   ```json
   // Remove this line:
   "openai": "^6.16.0",
   ```
3. Run `npm install` to update `package-lock.json`

---

### 4. **Database Migration Strategy Conflict**
**Location:** `migrations/001_init.sql` and `prisma/schema.prisma`
**Issue:** The project has both:
- Raw SQL migration file (`migrations/001_init.sql`)
- Prisma schema file (`prisma/schema.prisma`)
- Prisma is being used in the code

This creates confusion about which migration system to use. Prisma should manage migrations, not raw SQL.

**Resolution:**
**Option A (Recommended):** Use Prisma migrations exclusively
1. Delete `migrations/001_init.sql`
2. Delete `scripts/migrate.js` (or keep as backup)
3. Use Prisma migrations: `npx prisma migrate dev`

**Option B:** Use raw SQL (not recommended if using Prisma)
1. Remove Prisma entirely
2. Use raw SQL queries with `pg` package

**Fix (Option A):**
1. Delete `migrations/001_init.sql`
2. Run: `npx prisma migrate dev --name init`
3. This will create the database schema based on `prisma/schema.prisma`

---

## Documentation Issues

### 5. **README Inconsistency - Wrong AI Provider Information**
**Location:** `README.md` (lines 9-10, 20, 28, 34)
**Issue:** README states the project uses:
- OpenAI Whisper for transcription
- GPT-4o for analysis

But the code actually uses:
- Google Gemini API for both transcription and analysis

**Resolution:**
Update README to reflect actual implementation with Gemini API.

**Fix:**
Update relevant sections in `README.md`:
```markdown
## Features
- **AI Processing**: 
  - Extracts audio using FFmpeg.
  - Generates transcript using Google Gemini 1.5 Flash.
  - Identifies viral moments using Gemini 1.5 Flash.

## Architecture
- **AI**: Google Gemini API.

## Prerequisites
- Google Gemini API Key.

## Environment Variables
Create a `.env.local` file in the root:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/videoclipper
GEMINI_API_KEY=your-gemini-api-key-here
```

## AI Usage
- **Gemini 1.5 Flash**: Transcription and context-aware content selection.
```

---

### 6. **Missing Environment Variable Documentation**
**Location:** `README.md`, `.env.local` (doesn't exist)
**Issue:** 
- README only mentions `OPENAI_API_KEY` in environment variables
- Code requires `GEMINI_API_KEY` (used in `lib/ai.ts`)
- Missing `DATABASE_URL` documentation (though mentioned)

**Resolution:**
Update README environment variables section to include `GEMINI_API_KEY` and remove `OPENAI_API_KEY` if not needed.

**Fix:**
See fix for Issue #5 above.

---

## Code Quality Issues

### 7. **ESLint Configuration Potential Syntax Issue**
**Location:** `eslint.config.mjs` (line 1)
**Issue:** The import statement might not be correct for ESLint v9 flat config format.

**Current:**
```javascript
import { defineConfig, globalIgnores } from "eslint/config";
```

**Resolution:**
Verify if this is the correct syntax for ESLint 9. The correct import should be:
```javascript
import { defineConfig } from "eslint-define-config";
// OR
import eslint from "@eslint/js";
```

Actually, with `eslint-config-next`, the config should likely be:
```javascript
import { defineConfig } from "eslint-define-config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
```

**Fix:**
Check ESLint 9 documentation or use Next.js recommended ESLint config approach.

---

### 8. **Missing Error Handling for Missing API Keys**
**Location:** `lib/ai.ts`, `lib/pipeline.ts`
**Issue:** 
- `lib/ai.ts` warns if `GEMINI_API_KEY` is missing but continues
- If API key is missing, the Gemini API call will fail at runtime

**Resolution:**
Add better error handling and validation.

**Fix (Optional Enhancement):**
```typescript
// In lib/ai.ts
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
}

export const genAI = new GoogleGenerativeAI(apiKey);
```

---

### 9. **Missing File Size Validation**
**Location:** `app/api/upload/route.ts`
**Issue:** No validation for uploaded file size before saving to disk. Could cause disk space issues or timeout.

**Resolution:**
Add file size validation before processing.

**Fix (Optional Enhancement):**
```typescript
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
        { error: 'File size exceeds maximum allowed size (500MB)' },
        { status: 400 }
    );
}
```

---

### 10. **Missing Directory Creation Validation**
**Location:** `app/api/upload/route.ts` (line 18)
**Issue:** Uploads directory might not exist, causing write to fail.

**Resolution:**
Ensure directory exists before writing (already done in `lib/pipeline.ts` but not in upload route).

**Fix:**
```typescript
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
```

---

## Priority Order for Fixes

1. **Critical (Do First):**
   - Fix #1: Remove unused import from `lib/pipeline.ts`
   - Fix #2: Add Prisma generate script
   - Fix #4: Resolve database migration conflict

2. **Important (Do Second):**
   - Fix #3: Remove unused OpenAI dependency (if not needed)
   - Fix #5: Update README documentation

3. **Nice to Have (Optional):**
   - Fix #7: Verify ESLint config
   - Fix #8-10: Add error handling and validations

---

## Quick Fix Command Summary

```bash
# 1. Fix package.json scripts
# (Edit package.json manually)

# 2. Generate Prisma Client
npm run postinstall
# OR
npx prisma generate

# 3. Run Prisma migration (if using Prisma)
npx prisma migrate dev --name init

# 4. Remove unused package
npm uninstall openai

# 5. Verify build
npm run build
```

---

## Testing Checklist After Fixes

- [ ] `npm install` completes without errors
- [ ] `npx prisma generate` runs successfully
- [ ] `npm run build` completes without errors
- [ ] No TypeScript errors in IDE
- [ ] No ESLint errors (run `npm run lint`)
- [ ] Application starts with `npm run dev`
- [ ] Video upload works
- [ ] API endpoints respond correctly
