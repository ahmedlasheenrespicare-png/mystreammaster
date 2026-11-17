"""Render the requested poster / dark cover / sliding rail / stack sequence."""
import importlib.util, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

root=Path(__file__).resolve().parents[2]; ffmpeg=sys.argv[1]
spec=importlib.util.spec_from_file_location('evok_cards',Path(__file__).with_name('build-evok.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
out=root/'home-preview/hero-video-preview/hero-poster-strip-stack.mp4'
W,H=960,540;fps=30;hold=1.30;transition=.38;stage=hold+transition;rail_duration=26;stack_step=.78;stack_hold=.55;ending=1

def ease(x):
    x=max(0,min(1,x));return x*x*(3-2*x)
def fit(im,size):return ImageOps.fit(im,size,method=Image.Resampling.LANCZOS,centering=(.5,.42))
def text_lines(draw,text,font,width):return mod.wrap(draw,text,font,width)
def designs(i):
    name,title,kind=mod.scenes[i];src=Image.open(mod.layers/(name+'.jpg')).convert('RGB');font=mod.font
    background=fit(src,(W,H)).convert('RGBA');background=Image.alpha_composite(background,Image.new('RGBA',(W,H),(0,0,0,62)))
    poster=background.copy();d=ImageDraw.Draw(poster);d.rectangle((316,35,644,505),fill='#d9d2bf');poster.paste(fit(src,(306,250)),(327,47));d=ImageDraw.Draw(poster)
    d.text((338,318),kind+' / '+str(i+1).zfill(2),font=font(14),fill='#655b4e');y=352;f=font(25)
    for line in text_lines(d,title.upper(),f,285):d.text((338,y),line,font=f,fill='#292623');y+=30
    d.line((338,472,620,472),fill='#837964',width=1)
    dark=fit(src,(W,H)).convert('RGB');d=ImageDraw.Draw(dark,'RGBA');d.rectangle((0,0,W,H),fill=(0,0,0,60));d.rectangle((290,35,670,505),fill=(13,13,16,198),outline=(236,228,212,185),width=2)
    d.text((320,78),kind+' / '+str(i+1).zfill(2),font=font(14),fill='#e6dccc');y=135;f=font(30)
    for line in text_lines(d,title.upper(),f,300):d.text((320,y),line,font=f,fill='white');y+=37
    d.line((320,332,640,332),fill=(235,226,209,185),width=1);d.text((320,428),'STORIES',font=font(14),fill='#e8dfd0')
    # Every rail card has a real image and its title, in the same fixed sequence.
    rail=Image.new('RGB',(220,292),'#faf9f5');rail.paste(fit(src,(202,213)),(9,9));d=ImageDraw.Draw(rail);f=font(14);y=236
    for line in text_lines(d,title.upper(),f,202)[:2]:d.text((9,y),line,font=f,fill='#302b29');y+=18
    d.line((9,280,211,280),fill='#c6bca9',width=1)
    return background,poster,dark.convert('RGBA'),rail.convert('RGBA')

def place(canvas,image,x,y,scale=1,angle=0):
    if scale!=1:image=image.resize((round(image.width*scale),round(image.height*scale)),Image.Resampling.BICUBIC)
    if angle:image=image.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True)
    canvas.paste(image,(round(x-image.width/2),round(y-image.height/2)),image)
def reveal(base,final,box,amount):
    amount=ease(amount)
    if amount>=1:return final
    im=base.copy();x0,y0,x1,y1=box;height=round((y1-y0)*amount)
    if height>0:im.paste(final.crop((x0,y0,x1,y0+height)),(x0,y1-height))
    return im

items=[designs(i) for i in range(len(mod.scenes))];count=len(items)
# Each work appears once as a pale poster over its full-bleed picture.
sequence=[(i,1) for i in range(count)];detail_duration=len(sequence)*stage
sheets=[item[1].resize((W,490),Image.Resampling.LANCZOS) for item in items]
stack_backs=[]
for start in range(count+1):
    canvas=Image.new('RGBA',(W,H),(0,0,0,255))
    if start==count:canvas.paste(sheets[-1],(0,5))
    else:
        for k in range(count-1,start-1,-1):canvas.paste(sheets[k],(0,round(5+4*min(k-start,4))))
    stack_backs.append(canvas)
stack_duration=stack_hold+count*stack_step+ending;duration=detail_duration+rail_duration+stack_duration
cmd=[ffmpeg,'-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(fps),'-i','-','-an','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart','-y',str(out)]
p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
try:
    for frame in range(round(duration*fps)):
        t=frame/fps;canvas=Image.new('RGBA',(W,H),(7,8,9,255))
        if t<detail_duration:
            pos=t/stage;index=min(int(pos),len(sequence)-1);local=(pos-index)*stage;i,kind=sequence[index];base,poster,dark,_=items[i];final=poster if kind==1 else dark;box=(316,35,645,506) if kind==1 else (290,35,671,506)
            if local<hold:
                current=reveal(base,final,box,(local-.03)/.48);place(canvas,current,W/2,H/2,1+.008*local/hold)
            else:
                v=ease((local-hold)/transition)
                ni,nkind=sequence[(index+1)%len(sequence)];place(canvas,items[ni][0],W/2,H/2,1.008-.008*v)
                place(canvas,final,W/2-32*v,H/2-650*v,1.008,4*v)
        elif t<detail_duration+rail_duration:
            # A single continuous sideways track: all 30 cards cross the center.
            q=(t-detail_duration)/rail_duration;move=ease(q);step=244;first=(W-100)/2-110;offset=move*(count-1)*step
            # The reference's warm presentation board and light editorial page,
            # expanded to the full frame as requested.
            canvas=Image.new('RGBA',(W,H),'#d8d1bf');d=ImageDraw.Draw(canvas)
            d.text((55,40),'FILMS  /  SERIES  /  HEROES',font=mod.font(15),fill='#645d50')
            d.rectangle((50,92,910,446),fill='#f5f4ef')
            viewport=Image.new('RGBA',(860,292),'#f5f4ef')
            for i,item in enumerate(items):
                x=first+i*step-offset
                if -240<x<1100:viewport.paste(item[3],(round(x),0),item[3])
            canvas.paste(viewport,(50,122));d=ImageDraw.Draw(canvas);d.line((55,495,905,495),fill='#9d9380',width=1)
        else:
            q=t-detail_duration-rail_duration
            if q<stack_hold:canvas.paste(stack_backs[0],(0,0))
            elif q<stack_hold+count*stack_step:
                pos=(q-stack_hold)/stack_step;i=min(int(pos),count-1);v=ease(((pos-i)-.38)/.62)
                canvas.paste(stack_backs[i+1],(0,0));sheet=sheets[i].rotate(4*v,resample=Image.Resampling.BICUBIC,expand=True)
                canvas.paste(sheet,(round(W/2-sheet.width/2-24*v),round(5-610*v)),sheet)
            else:canvas.paste(stack_backs[-1],(0,0))
        p.stdin.write(canvas.convert('RGB').tobytes())
        if frame%(fps*15)==0:print(f'{t:.0f}s / {duration:.0f}s',flush=True)
finally:p.stdin.close()
if p.wait()!=0:raise RuntimeError('ffmpeg failed')
print('Finished',out,flush=True)
