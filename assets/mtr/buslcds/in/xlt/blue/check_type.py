# -*- coding: utf-8 -*-
import re
path = r'c:\Users\caigu\Documents\GitHub\MTR-Buslcds\assets\mtr\buslcds\in\xlt\blue\route-map.js'
code = open(path, 'rb').read().decode('utf-8','ignore')

lines = code.split('\n')
print('=== 所有 type 出现位置 ===')
for i,l in enumerate(lines):
    if 'type' in l and ('both' in l or 'up' in l or 'dn' in l or 'oneway' in l or '双向' in l):
        print(f'{i+1}: {l.strip()[:150]}')
print()

idx = code.find('var type =')
if idx < 0: idx = code.find('var type=')
if idx >= 0:
    line_start = code[:idx].count('\n') + 1
    print(f'=== type 决定逻辑 (line {line_start}) ===')
    # 找到下一个 } 结束这个逻辑块
    end = code.find('result.push({', idx)
    print(code[idx:end])
