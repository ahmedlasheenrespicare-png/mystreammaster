"""Build an Evok-inspired independent hero preview: python build-evok.py /path/to/ffmpeg."""
import sys, subprocess, tempfile, random
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw, ImageFont, ImageOps

root=Path(__file__).resolve().parents[2]; layers=root/'home-preview/saved-reference/assets/cinema-layers'; ff=sys.argv[1]
out=root/'home-preview/hero-video-preview/hero-evok-preview.mp4'
scenes=[('scene-spider','Spider-Man','HERO'),('scene-super','Superman','HERO'),('scene-iron','Iron Man','HERO'),('film-godzilla','Godzilla Minus Zero','FILM'),('film-wildhorse','Wild Horse Nine','FILM'),('film-everything','You Can See Everything','FILM'),('film-wildwood','Wildwood','FILM'),('film-resident','Resident Evil','FILM'),('film-cycle','The Cycle','FILM'),('film-wicker','Wicker','FILM'),('film-invite','The Invite','FILM'),('film-tenzing','Tenzing','FILM'),('film-odyssey','The Odyssey','FILM'),('series-knight','A Knight of the Seven Kingdoms','SERIES'),('series-dragon','House of the Dragon','SERIES'),('series-starcity','Star City','SERIES'),('series-silo','Silo','SERIES'),('series-vision','VisionQuest','SERIES'),('series-pitt','The Pitt','SERIES'),('series-dutton','Dutton Ranch','SERIES'),('series-testaments','The Testaments','SERIES'),('series-legends','Legends','SERIES'),('series-sherlock','Young Sherlock','SERIES'),('series-widow',"Widow's Bay",'SERIES'),('series-stranger','Stranger Things','SERIES'),('series-beef','Beef','SERIES'),('series-bear','The Bear','SERIES'),('series-earlyspring','The Early Spring','SERIES'),('series-lesson','Teach You a Lesson','SERIES'),('series-jade','Pursuit of Jade','SERIES')]
random.Random(1701).shuffle(scenes)
regular='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def font(size,strong=False):return ImageFont.truetype(bold if strong else regular,size)
def fit(image,size):return ImageOps.fit(image,size,method=Image.Resampling.LANCZOS,centering=(.5,.42))
def wrap(draw,text,f,maxwidth):
    lines=[];line=''
    for word in text.split():
        c=(line+' '+word).strip()
        if draw.textlength(c,font=f)>maxwidth and line:lines.append(line);line=word
        else:line=c
    if line:lines.append(line)
    return lines

def card(i,tmp):
    name,title,kind=scenes[i];src=Image.open(layers/(name+'.jpg')).convert('RGB'); n=420
    if i%3==0:
        # A restrained cream presentation board framing an image.
        im=Image.new('RGB',(n,n),'#d7cfb9'); im.paste(fit(src,(352,215)),(34,76)); d=ImageDraw.Draw(im)
        d.rectangle((34,76,386,291),outline='#eee7d8',width=2)
        d.text((36,35),kind+'  /  '+str(i+1).zfill(2),font=font(11),fill='#574e3e')
        f=font(18); y=320
        for line in wrap(d,title.upper(),f,348):d.text((36,y),line,font=f,fill='#272421');y+=23
        d.line((36,394,384,394),fill='#8b8069',width=1)
    elif i%3==1:
        # Image in the background, a small framed editorial poster in front.
        im=fit(src,(n,n));d=ImageDraw.Draw(im,'RGBA');d.rectangle((0,0,n,n),fill=(9,9,9,65))
        d.rectangle((112,48,307,366),fill=(220,212,193,255)); im.paste(fit(src,(177,152)),(121,57)); d=ImageDraw.Draw(im)
        d.text((125,227),kind+' / '+str(i+1).zfill(2),font=font(10),fill='#665c4f');f=font(15);y=254
        for line in wrap(d,title.upper(),f,170):d.text((125,y),line,font=f,fill='#302b29');y+=19
        d.line((125,342,293,342),fill='#857d6b',width=1)
    else:
        # Dark cinematic cover and oversized issue number.
        im=fit(src,(n,n));d=ImageDraw.Draw(im,'RGBA');d.rectangle((0,0,n,n),fill=(0,0,0,85));d.rectangle((105,62,315,362),fill=(13,13,16,175),outline=(245,238,221,170),width=1)
        d.text((122,86),kind+' / '+str(i+1).zfill(2),font=font(10),fill='white');f=font(18);y=125
        for line in wrap(d,title.upper(),f,175):d.text((122,y),line,font=f,fill='white');y+=23
        d.line((122,227,292,227),fill=(226,211,185,210),width=1);d.text((122,314),'STORIES',font=font(12),fill='#e8dfd0')
    p=tmp/f'{i:02}.png';im.save(p);return p

def run(cmd):subprocess.run(cmd,check=True)
def encode(i,tmp,images):
    # Incoming card travels upward while the preceding sheet leaves the frame;
    # the thin stack remains visible beneath, as in the supplied reference.
    dest=tmp/f'{i:02}.mp4';time=2.0
    f="[0:v]format=rgba,colorchannelmixer=aa=0.18[back];[1:v]format=rgba[cur];[2:v]format=rgba[nxt];color=c=black:s=960x540:r=24:d=2[base];[base][back]overlay=x=270:y=67:shortest=1[b];[b][cur]overlay=x=270:y='if(lt(t,1.6),60,60-(t-1.6)*1450)':shortest=1[c];[c][nxt]overlay=x=270:y='if(lt(t,1.6),550,550-(t-1.6)*1225)':shortest=1,format=yuv420p[v]"
    run([ff,'-hide_banner','-loglevel','error','-loop','1','-framerate','24','-i',str(images[(i+2)%len(images)]),'-loop','1','-framerate','24','-i',str(images[i]),'-loop','1','-framerate','24','-i',str(images[(i+1)%len(images)]),'-filter_complex',f,'-map','[v]','-t',str(time),'-an','-c:v','libx264','-preset','veryfast','-crf','22','-y',str(dest)])
    print('Encoded',i+1,'/',len(scenes),flush=True);return dest

if __name__ == "__main__":
    with tempfile.TemporaryDirectory(prefix='evok-cinema-') as d:
        tmp=Path(d);images=[card(i,tmp) for i in range(len(scenes))]
        intro=tmp/'intro.mp4'
        run([ff,'-hide_banner','-loglevel','error','-i',str(root/'home-preview/saved-reference/assets/hero-video.mp4'),'-vf','scale=960:540,fps=24,format=yuv420p','-an','-c:v','libx264','-preset','veryfast','-crf','23','-y',str(intro)])
        with ThreadPoolExecutor(max_workers=2) as p: clips=list(p.map(lambda i:encode(i,tmp,images),range(len(scenes))))
        listing=tmp/'concat.txt';listing.write_text(''.join("file '"+str(p)+"'\n" for p in [intro,*clips]))
        run([ff,'-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(listing),'-c','copy','-movflags','+faststart','-y',str(out)])
        print('Finished',out,flush=True)
