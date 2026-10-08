# How to Update GitHub (Browser Only - No Terminal)

## Files to Download & Upload

Download these 4 files from the outputs folder:
1. ✅ **server-3.8-live.js**
2. ✅ **index-3.8-live.html**
3. ✅ **package.json**
4. ✅ **.env.example**

---

## Step 1: Open Your GitHub Repo

Go to: `https://github.com/Dedi-automation/med-spa-gemini-live1`

---

## Step 2: Upload Files to GitHub

### Option A: Upload Each File (Safest)

1. **Click the green "Code" button** → scroll down → **"Upload files"**

   ![upload button location]

2. **Drag and drop the 4 files** OR click **"choose your files"**

3. **Files will appear in the upload area:**
   - server-3.8-live.js
   - index-3.8-live.html
   - package.json
   - .env.example

4. **Scroll down** and enter a commit message:
   ```
   Update to Gemini 3.8 Live WebSocket architecture
   ```

5. **Click "Commit changes"** ✅

GitHub will automatically commit and push to main branch.

### Option B: Replace Existing Files (If you want to overwrite old server.js/index.html)

If you want to keep your old files as backup:

1. **Go to your repo main page**
2. **Click on `server.js`**
3. **Click the pencil icon** (Edit)
4. **Delete all content**
5. **Paste the content from `server-3.8-live.js`**
6. **Scroll down, enter commit message:**
   ```
   Replace server.js with Gemini 3.8 Live version
   ```
7. **Click "Commit changes"**

Repeat for `index.html` with content from `index-3.8-live.html`.

---

## Step 3: Verify Upload

1. **Refresh your GitHub repo page**
2. **You should see the new files:**
   - ✅ server-3.8-live.js
   - ✅ index-3.8-live.html
   - ✅ package.json
   - ✅ .env.example

---

## Step 4: Update Your Local Folder

Now that GitHub is updated, update your local computer:

### Windows (File Explorer):

1. **Open:** `C:/work/Gemini Voice Bot Demo/`

2. **Download the same 4 files from outputs**

3. **Paste them into your local folder** (overwrite if asked)

4. **You should now have:**
   ```
   C:/work/Gemini Voice Bot Demo/
   ├── server-3.8-live.js         ← NEW
   ├── index-3.8-live.html         ← NEW
   ├── package.json               ← NEW/UPDATED
   ├── .env                        ← (your personal key, don't commit)
   ├── .env.example               ← NEW
   └── README-3.8-LIVE.md         ← NEW (optional)
   ```

---

## Step 5: Test Locally

1. **Open PowerShell in your folder:**
   - Hold Shift + Right-click in folder
   - Select "Open PowerShell here"

2. **Run:**
   ```bash
   npm install
   npm start
   ```

3. **Open browser:**
   ```
   http://localhost:3000
   ```

---

## Why Both?

| Location | Purpose |
|----------|---------|
| **GitHub** | Backup + Render deployment |
| **Local** | Where you actually run & test the code |

If only one is updated, they get out of sync and things break.

---

## Checklist

- [ ] Downloaded 4 files
- [ ] Uploaded to GitHub via browser
- [ ] Verified files on GitHub
- [ ] Pasted files into local folder
- [ ] Ran `npm install`
- [ ] Ran `npm start`
- [ ] Tested at http://localhost:3000
- [ ] Clicked "Start Call" and spoke to Lily
- [ ] Got response with voice

Done! 🎉
