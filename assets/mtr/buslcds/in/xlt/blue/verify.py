#!/usr/bin/env python
# verify.py — final verification
import os

root = r"c:\Users\caigu\Documents\GitHub\MTR-Buslcds\assets\mtr\buslcds"
files = [
    'dispatcher.js',
    'lib/dianxian_util.js',
    'out/dianxian/bw/main.js',
    'out/dianxian/kl/main.js',
    'in/dianxian/bw/main.js',
    'in/dianxian/kl/main.js'
]

print('=== FILE VERIFICATION ===')
ok = 0
for f in files:
    p = os.path.join(root, f)
    exists = os.path.exists(p)
    size = os.path.getsize(p) if exists else 0
    status = 'OK' if (exists and size > 0) else 'MISSING/EMPTY'
    print('  [%s] %s  (%d bytes)' % (status, f, size))
    if exists and size > 0: ok += 1
print('\nResult: %d/%d files OK' % (ok, len(files)))

print('\n=== MODULE_IMPL CHECK ===')
for f in files[1:]:
    p = os.path.join(root, f)
    with open(p, 'r', encoding='utf-8') as fh:
        c = fh.read()
    has_impl = 'MODULE_IMPL' in c
    print('  %s: MODULE_IMPL=%s' % (f, has_impl))

print('\n=== DISPATCHER PATCH CHECK ===')
p = os.path.join(root, 'dispatcher.js')
with open(p, 'r', encoding='utf-8') as fh:
    c = fh.read()
print('  MODULE_IMPL check: %s' % ('MODULE_IMPL' in c))
print('  include() call: %s' % ('include(Resources.id(fullPath' in c))
print('  variant impl loaded OK: %s' % ('variant impl loaded OK' in c))
print('  old stub removed: %s' % ('stub (variant=' not in c))

print('\n=== UTIL FUNCTIONS CHECK ===')
p = os.path.join(root, 'lib/dianxian_util.js')
with open(p, 'r', encoding='utf-8') as fh:
    c = fh.read()
funcs = ['makeScrollState', 'drawScrollingText', 'getStationInfo',
         'CentreText', 'getBeijingTime', 'getTemperature', 'LeftText']
for fn in funcs:
    print('  %s: %s' % (fn, fn in c))

print('\n=== KEY STRINGS CHECK ===')
checks = [
    ('out/dianxian/bw/main.js', '机 动 车'),
    ('out/dianxian/kl/main.js', 'cepainum.otf'),
    ('in/dianxian/bw/main.js', 'SUB_TEMPLATES_BW'),
    ('in/dianxian/kl/main.js', 'colorful'),
    ('in/dianxian/kl/main.js', '_KL_YELLOW'),
    ('in/dianxian/kl/main.js', '_KL_RED_C'),
    ('lib/dianxian_util.js', 'KL_LED_FONT'),
    ('lib/dianxian_util.js', 'BW_LED_FONT'),
]
for f, s in checks:
    p = os.path.join(root, f)
    with open(p, 'r', encoding='utf-8') as fh:
        c = fh.read()
    print('  %s in %s: %s' % (s, f, s in c))

print('\nAll done!')
