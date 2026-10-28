import re, json
from pathlib import Path
import fitz

ROOT=Path(__file__).resolve().parents[1]
(ROOT.parent/'tmp/pdfs').mkdir(parents=True,exist_ok=True)
PDF=next(ROOT.parent.glob('*.pdf'))
doc=fitz.open(PDF)
lines=[]
for pi,p in enumerate(doc):
    for b in p.get_text('dict')['blocks']:
        for l in b.get('lines',[]):
            text=''.join(s['text'] for s in l['spans'])
            if text.strip() and l['bbox'][1]<650:
                lines.append(dict(page=pi, text=text, bbox=l['bbox'], baseline=l['spans'][0]['origin'][1]))
Path(ROOT.parent/'tmp/pdfs/lines.json').write_text(json.dumps(lines,ensure_ascii=False,indent=2),encoding='utf-8')
for l in lines:
    s=l['text']
    if re.match(r'^[1-6]-\d+\.',s) or (re.match(r'^[一二三四五]、',s) and l['page']>=6) or (re.match(r'^(答[：:]|证明[.．])',s) and 6<=l['page']<90):
        print(l['page']+1,round(l['bbox'][0],1),round(l['baseline'],1),s[:65])
