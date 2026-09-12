# -*- coding: utf-8 -*-
path = r'c:\Users\caigu\Documents\GitHub\MTR-Buslcds\assets\mtr\buslcds\in\xlt\blue\route-map.js'
code = open(path, 'rb').read().decode('utf-8','ignore')
lines = code.split('\n')
print('=== 所有 reverse 出现位置 ===')
for i,l in enumerate(lines):
    if 'reverse' in l.lower():
        print(f'{i+1}: {l.strip()[:150]}')
