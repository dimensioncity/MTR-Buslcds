#!/usr/bin/env python
# build_dianxian.py — 生成/补丁所有电显脚本
import os, sys, textwrap

ROOT = r"c:\Users\caigu\Documents\GitHub\MTR-Buslcds\assets\mtr\buslcds"

def write(relpath, content):
    full = os.path.join(ROOT, relpath)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  WROTE {relpath} ({os.path.getsize(full)} bytes)")

def patch_dispatcher():
    p = os.path.join(ROOT, "dispatcher.js")
    with open(p, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    i = 0
    changed = False
    while i < len(lines):
        line = lines[i]
        # Replace stub print line + catch line with new content
        if 'stub (variant=' in line and 'path=' in line and 'fullPath' in line:
            # This is the old stub print. Replace this line and the next (catch)
            if i + 1 < len(lines) and 'include skip' in lines[i+1]:
                # We'll emit new lines in place, skip old one
                new_lines.append(line.replace('stub (variant=', 'loading variant=').replace(', path=', ');\\r\\n        // Actually include the variant main.js!\\r\\n        include(Resources.id(fullPath + "/main.js"));\\r\\n        // If variant exposed MODULE_IMPL, use it to override buildConfig/renderOne\\r\\n        if (typeof MODULE_IMPL !== \'undefined\' && MODULE_IMPL) {\\r\\n          if (MODULE_IMPL.buildConfig) this.buildConfig = MODULE_IMPL.buildConfig;\\r\\n          if (MODULE_IMPL.renderOne)   this.renderOne   = MODULE_IMPL.renderOne;\\r\\n          print("[MTR] " + id + " variant impl loaded OK");\\r\\n        } else {\\r\\n          print("[MTR] " + id + " no MODULE_IMPL, using stub");\\r\\n        }\\r\\n      } catch(e) { print("[MTR] " + id + " include err: " + e); }\\r\\n    },'))
                i += 2  # skip both old lines
                changed = True
                continue
        new_lines.append(line)
        i += 1

    if changed:
        with open(p, 'w', encoding='utf-8', newline='') as f:
            f.writelines(new_lines)
        print("PATCHED dispatcher.js")
    else:
        print("WARNING: dispatcher.js patch pattern not found")

if __name__ == "__main__":
    print("build script ready")
