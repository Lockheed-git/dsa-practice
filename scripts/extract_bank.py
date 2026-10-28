"""Extract source-backed question/answer pairs; images preserve PDF mathematics."""
import re, json, shutil
from pathlib import Path
from collections import Counter
import fitz
from PIL import Image, ImageChops, ImageOps

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist'
ASSETS=OUT/'assets/questions'
ASSETS.mkdir(parents=True,exist_ok=True)
doc=fitz.open(next(ROOT.parent.glob('*.pdf')))
lines=json.loads((ROOT.parent/'tmp/pdfs/lines.json').read_text(encoding='utf-8'))
CHAPTERS=['概论','线性表','栈与队列','字符串','二叉树','树']
TYPES=['填空题','选择题','辨析与简答','算法设计与分析','数学证明']
head_re=re.compile(r'^[一二三四五]、')
q_re=re.compile(r'^([1-6])-([0-9]+)\.')
answer_re=re.compile(r'^(答[：:]|证明[.．]|\(1\) 证明[.．])')
pages={}
SCALE=2.7
def raster(pi):
    if pi not in pages:
        p=doc[pi].get_pixmap(matrix=fitz.Matrix(SCALE,SCALE),alpha=False)
        pages[pi]=Image.frombytes('RGB',[p.width,p.height],p.samples)
    return pages[pi]

def boundary(line):
    # Find a white scan line near the leading text baseline. Font metric boxes
    # overlap for radicals/superscripts, so their bbox tops are not valid cuts.
    im=raster(line['page']).convert('L')
    target=line['baseline']-11.5
    candidates=[]
    for py in range(round((target-2.5)*SCALE),round((target+1.5)*SCALE)):
        row=im.crop((round(51*SCALE),py,round(454*SCALE),py+1))
        dark=sum(1 for v in row.getdata() if v<190)
        candidates.append((dark,abs(py-target*SCALE),py))
    return min(candidates)[2]/SCALE

def loc(line): return (line['page'],boundary(line))
def chunks(start,end,key):
    images=[];texts=[];regions=[]
    for pi in range(start[0],end[0]+1):
        top=start[1] if pi==start[0] else 56
        bottom=end[1] if pi==end[0] else 650
        if bottom-top<1: continue
        region=(51,top,454,bottom)
        im=raster(pi).crop(tuple(round(v*SCALE) for v in region))
        diff=ImageChops.difference(im,Image.new('RGB',im.size,'white')).convert('L').point(lambda v:255 if v>65 else 0)
        box=diff.getbbox()
        if box is None: continue
        # Preserve a consistent horizontal scale; trim only blank vertical margins.
        y0=max(0,box[1]-4);y1=min(im.height,box[3]+5)
        im=im.crop((0,y0,im.width,y1))
        name=f'{key}-{len(images)+1}.webp'
        im.save(ASSETS/name,format='WEBP',lossless=True)
        images.append('assets/questions/'+name)
        actual=(51,top+y0/SCALE,454,top+y1/SCALE)
        regions.append({'page':pi+1,'rect':[round(v,3) for v in actual]})
        texts.append(doc[pi].get_text(clip=fitz.Rect(region),sort=True).strip())
    return images,'\n'.join(texts),regions

bank=[]
marks=[(i,l) for i,l in enumerate(lines) if l['page']>=6 and q_re.match(l['text'])]
for k,(idx,q) in enumerate(marks):
    following=marks[k+1][0] if k+1<len(marks) else next(i for i,l in enumerate(lines) if l['page']==90)
    stop=next((l for l in lines[idx+1:following] if head_re.match(l['text'])),lines[following])
    ans=next(l for l in lines[idx+1:following] if answer_re.match(l['text']))
    heading=next(l for l in reversed(lines[:idx]) if head_re.match(l['text']))
    typ='一二三四五'.index(heading['text'][0])
    m=q_re.match(q['text']);qid=m.group(0)[:-1]
    qi,qt,qr=chunks(loc(q),loc(ans),qid+'-q')
    ai,at,ar=chunks(loc(ans),loc(stop),qid+'-a')
    bank.append(dict(id=qid,chapter=int(m[1]),chapterName=CHAPTERS[int(m[1])-1],type=TYPES[typ],number=int(m[2]),important='★' in qt,question=qt,answer=at,questionImages=qi,answerImages=ai,questionRegions=qr,answerRegions=ar,sourcePage=q['page']+1,printedPage=q['page']-3,source='分章题'))

# The first three mock-exam sections print their answers together. Split those
# answers individually, rather than revealing the remaining questions' answers.
mock_answers=[
['基本运算（操作集合）；数据的存储结构。',
 '49.5。等概率删除平均移动 (n−1)/2 = 99/2 个元素。',
 '5。(2 − 7 + 10) mod 10 = 5。',
 '132。Catalan 数依次为 1, 2, 5, 14, 42, 132。',
 '−1 0 0 1 1 2 3。逐位：a → 0；ab → 0；aba → 1；abaa → 1；abaab → 2；abaaba → 3，因为 aba 既是前缀又是后缀。',
 '54。n₂ = n₀ − 1 = 19，所以 n = 20 + 15 + 19 = 54。',
 '50。⌈100/2⌉ = 50。',
 '11。2n − 1 = 2 × 6 − 1。',
 '21。30 − 9 = 21。',
 '2n + 1。n(K − 1) + 1，K = 3。'],
['D。二叉树是层次（树形）结构，一个结点可以有两个后继。',
 'C。4,1,…：先输出 4，说明 1、2、3 都在栈里、3 在最上；它们只能按 3,2,1 的相对次序出来，而 C 里是 1,…,3,2，违反。用判定法则：取 p₁ = 4，p₂ = 1，p₄ = 3，有 1 < 3 < 4，正是被禁的模式。',
 'B。这是“前插转后插”的经典技巧：先把 s 接在 p 之后，再交换 p 与 s 的数据域，效果等价于在 p 前插入，代价 O(1)。D 是错的：只改 s->next 而不改 p 的前驱，s 根本没挂进链里。',
 'C。有了计数器就能存满 M 个，不必牺牲一格。',
 'A。后序末为根 A；中序中 A 左边 DBE 是左子树、右边 FC 是右子树。左子树后序 DEB → 根 B，中序 DBE → 左 D、右 E；右子树后序 FC → 根 C，中序 FC → F 是 C 的左孩子。前序 = A BDE CF = ABDECF。',
 'A。逐个验 Kᵢ ≥ K₂ᵢ₊₁, K₂ᵢ₊₂：A 中 90 ≥ 70,80；70 ≥ 60,50；80 ≥ 30。B 错在 K₂ = 70 < K₅ = 85；C 错在 K₁ = 70 < K₃ = 85；D 是递增序列，它是最小堆，而不是最大堆。',
 'B。右链就是“兄弟链”，从根沿右链走到底经过的正是森林中各棵树的根，共 k 个。',
 'B。路径压缩是在查找沿途顺手做的；合并只改一根指针，无路可压。'],
['错。“最好/最坏/平均”挑的是输入，“O/Ω/Θ”定的是函数的界，这是两个正交的维度，可以自由组合：“最好情况是 O(n)”完全合法。单说“复杂度是 O(n²)”只承诺“不会比 n² 更糟”，并没有说清是对哪一类输入而言。严谨的写法是把两个维度都点明，例如“最坏情况下为 Θ(n²)”。',
 '链式队列的 front 和 rear 分别指向队头和队尾结点。出队时若摘走的正好是最后一个结点，队列变空，front 被置空，但 rear 仍指着那个已经被释放的结点——它成了一根野指针。下一次入队时若用 rear->next = 新结点去接，就会写进已释放的内存（典型表现是 AddressSanitizer 报 heap-use-after-free，也可能悄悄损坏堆而在别处崩溃）。正确做法：dequeue 发现队列变空时，把 rear 一并置空。',
 '因为失配之前已经匹配上的那一段是已知的：设在模式的位置 i 处失配，则 T 中与 P[0..i−1] 对齐的那一段与之逐字符相同。要让模式重新对上，新的对齐位置必须使模式的某个前缀等于 P[0..i−1] 的某个后缀，而“最长的这种前缀”的长度正是 next[i]——比它更短的对齐也许可行但更晚，比它更长的对齐必然失败。所以直接把模式右移 i − next[i] 位，目标下标停在原地继续比即可（next[i] = −1 时目标下标前进一格、模式从头比），被跳过的那些起点已经被证明不可能成功，不必回去试。这样 j 只增不减，匹配过程 O(n)。',
 '错。堆只保证父 ≤ 子（最小堆）这种局部有序，兄弟之间毫无关系，更不保证“左子树全部小于根、根小于右子树”。例如最小堆 [1,2,3]（根 1，左 2，右 3）的中序序列是 2 1 3，并不有序。堆的用途是 O(1) 取极值、O(log n) 增删，不支持按关键码检索；要中序有序得用二叉搜索树。']]

heads=[(i,l) for i,l in enumerate(lines) if 90<=l['page']<=95 and head_re.match(l['text'])]
for sec,(hi,heading) in enumerate(heads):
    end_i=heads[sec+1][0] if sec<4 else next(i for i,l in enumerate(lines) if l['page']==96)
    block=lines[hi+1:end_i]
    if sec<3:
        a=next(l for l in block if l['text'].startswith('答：'))
        a_idx=block.index(a)
        qs=[l for l in block[:a_idx] if re.match(r'^\d+\.',l['text']) and l['bbox'][0]<70]
        assert len(qs)==[10,8,4][sec], (sec,len(qs))
        for j,q in enumerate(qs):
            qid=f'mock-{sec+1}-{j+1}'
            qi,qt,qr=chunks(loc(q),loc(qs[j+1] if j+1<len(qs) else a),qid+'-q')
            bank.append(dict(id=qid,chapter=7,chapterName='模拟卷',type=TYPES[sec],number=j+1,important=False,question=qt,answer=mock_answers[sec][j],questionImages=qi,answerImages=[],questionRegions=qr,answerRegions=[],sourcePage=q['page']+1,printedPage=q['page']-3,answerSourcePages=[91] if sec==0 else ([92] if sec==1 else [92,93]),source='模拟卷'))
    else:
        qs=[l for l in block if re.match(r'^\d+\.',l['text']) and l['bbox'][0]<70] if sec==3 else [block[0]]
        assert len(qs)==(3 if sec==3 else 1)
        for j,q in enumerate(qs):
            stop=qs[j+1] if j+1<len(qs) else (heads[sec+1][1] if sec<4 else lines[end_i])
            a=next(l for l in block[block.index(q)+1:] if answer_re.match(l['text']))
            qid=f'mock-{sec+1}-{j+1}'
            qi,qt,qr=chunks(loc(q),loc(a),qid+'-q')
            ai,at,ar=chunks(loc(a),loc(stop),qid+'-a')
            bank.append(dict(id=qid,chapter=7,chapterName='模拟卷',type=TYPES[sec],number=j+1,important=False,question=qt,answer=at,questionImages=qi,answerImages=ai,questionRegions=qr,answerRegions=ar,sourcePage=q['page']+1,printedPage=q['page']-3,source='模拟卷'))

assert len(bank)==210
assert len({q['id'] for q in bank})==210
assert all(q['question'] and q['answer'] and q['questionImages'] for q in bank)
for c in range(1,7):
    nums=[q['number'] for q in bank if q['chapter']==c]
    assert nums==list(range(1,len(nums)+1)), (c,nums)
payload=dict(title='数算 A · 期中复习题库',sourceFile=doc.name.split('\\')[-1],total=len(bank),chapters=[dict(id=i+1,name=n,count=sum(q['chapter']==i+1 for q in bank)) for i,n in enumerate(CHAPTERS+['模拟卷'])],types=TYPES,questions=bank)
# Keep the shared ADT declarations that precede several algorithm sections.
contexts={}
for idx,heading in enumerate(lines):
    if heading['text'].startswith('四、') and heading['page']<90 and heading['page']>=6:
        first=next(l for l in lines[idx+1:] if q_re.match(l['text']))
        between=lines[idx+1:lines.index(first)]
        if between:
            chapter=int(q_re.match(first['text'])[1])
            ci,ct,cr=chunks(loc(between[0]),loc(first),f'context-{chapter}')
            contexts[str(chapter)]=dict(images=ci,text=ct,regions=cr)
conv=next(l for l in lines if l['page']==4 and l['text'].startswith('几个贯穿'))
ci,ct,cr=chunks(loc(conv),(4,650),'conventions')
payload['contexts']=contexts
payload['conventions']=dict(images=ci,text=ct,regions=cr)
(OUT/'questions.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'questions.js').write_text('window.QUESTION_BANK = '+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
shutil.copy2(doc.name,OUT/'source.pdf')
print(json.dumps({'total':len(bank),'chapters':payload['chapters'],'types':dict(Counter(q['type'] for q in bank)),'images':sum(len(q['questionImages'])+len(q['answerImages']) for q in bank)},ensure_ascii=False,indent=2))
