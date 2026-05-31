const fs = require('fs');
let css = fs.readFileSync('src/components/Navbar/Navbar.css', 'utf-8');

// Replace the logo styles
const searchString = `/* ── Cell 2: Logo ── */
.navbar__logo-cell {
  flex: 1;
  border-left: 1px solid rgb(93, 64, 55);
  border-right: 1px solid rgb(93, 64, 55);
  font-family: var(--font-heading, Georgia, serif);
  font-size: 15px;
  letter-spacing: -0.02em;
  color: rgb(93, 64, 55);
}
.navbar__logo-img {
  max-height: 32px;
  max-width: 160px;
  object-fit: contain;
}
.navbar__logo-text {
  font-family: var(--font-heading, Georgia, serif);
  font-size: 15px;
  letter-spacing: -0.02em;
}`;

const replaceString = `/* ── Cell 2: Logo ── */
.navbar__logo-cell {
  flex: 1;
  border-left: 1px solid rgb(93, 64, 55);
  border-right: 1px solid rgb(93, 64, 55);
  text-decoration: none;
}

/* Initially, hide SVG, show written text for big screens */
.navbar__logo-img {
  display: none;
  max-height: 32px;
  max-width: 160px;
  object-fit: contain;
}

.navbar__logo-text-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.navbar__logo-the {
  font-family: 'Silver South Script', cursive;
  font-size: 26px; /* Adjust if needed */
  color: #C4021D;
  transform: translateY(2px);
}

.navbar__logo-bloom {
  font-family: 'Boiling Bold', sans-serif;
  font-size: 20px; /* Adjust if needed */
  letter-spacing: -0.06em;
  color: #C4021D;
  text-transform: uppercase;
}

@media (max-width: 820px) {
  .navbar__logo-img {
    display: block;
  }
  .navbar__logo-text-wrapper {
    display: none;
  }
}`;

fs.writeFileSync('src/components/Navbar/Navbar.css', css.replace(searchString, replaceString));
console.log("Updated Navbar.css");
