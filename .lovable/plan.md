## Chrome se GitHub connect — final approach

Aapke Chrome me "Add connection" click par kuch nahi hota kyunki popup silently block ho raha hai. Chrome mobile me ye 3 cheezein karo — inme se ek zaroor kaam karega.

### Step 1 — Chrome ko Desktop site mode me daalo (sabse important)
1. `lovable.dev` khol ke login karo
2. Chrome ke upar right ⋮ menu → **Desktop site** ✅ tick karo
3. Page reload hoga → Settings → Git → **Add connection**
4. Desktop mode me popup block nahi hota, GitHub authorize page seedha khulega

### Step 2 — Agar Desktop mode me bhi blank
Chrome address bar me left side 🔒/ⓘ icon → **Permissions** → **Pop-ups and redirects** → **Allow**. Phir Add connection dobara.

### Step 3 — Long-press fallback
"Add connection" button ko 2 second **press-and-hold** karo → menu aayega → **Open in new tab**. Naya tab me GitHub authorize page load hoga.

### Why direct connect nahi ho sakta
Mai (AI) aapke GitHub account me authorize nahi kar sakta — ye security ke liye sirf aap hi browser me approve kar sakte ho. Iska koi bypass nahi hai.

### Agar ye teeno fail
Mujhe batao kaunsa step try kiya aur kya hua (screenshot ya exact text). Tab hum Firefox route ya support ticket path pe jayenge.

**Recommendation:** pehle **Step 1 (Desktop site mode)** try karo — 90% chance yahi fix karega.