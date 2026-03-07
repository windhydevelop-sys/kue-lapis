const fs = require('fs');
let content = fs.readFileSync('models/Product.js', 'utf8');

// Replace pre-save hook
content = content.replace(/if\s*\(this\.isModified\('([^']+)'\)\)\s*\{\s*this\.\1\s*=\s*encrypt\(this\.\1\);\s*\}/g, 
  "if (this.isModified('$1') && this.$1 && !String(this.$1).startsWith('U2FsdGVkX1')) {\n      this.$1 = encrypt(this.$1);\n    }");

// Replace pre-findOneAndUpdate hook
content = content.replace(/if\s*\(update\.([^)\s]+)\)\s*\{\s*update\.\1\s*=\s*encrypt\(update\.\1\);\s*\}/g,
  "if (update.$1 && !String(update.$1).startsWith('U2FsdGVkX1')) {\n      update.$1 = encrypt(update.$1);\n    }");

fs.writeFileSync('models/Product.js', content);
console.log("Product.js updated");
