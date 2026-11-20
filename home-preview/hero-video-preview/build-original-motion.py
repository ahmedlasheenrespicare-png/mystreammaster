"""Keep the original hero motion and replace unlabelled tiles only during static layouts."""
from pathlib import Path
import subprocess,sys,tempfile
from PIL import Image,ImageOps,ImageDraw
root=Path(__file__).resolve().parents[2];ff=sys.argv[1];layers=root/'home-preview/saved-reference/assets/cinema-layers';original=root/'home-preview/hero-video-preview/hero-original-source.mp4';append=root/'home-preview/hero-video-preview/hero-poster-strip-stack.mp4';out=root/'home-preview/hero-video-preview/hero-original-motion-preview.mp4'
def tile(canvas,name,box):
    x,y,w,h=box;src=Image.open(layers/name).convert('RGB');im=ImageOps.fit(src,(w,h),method=Image.Resampling.LANCZOS,centering=(.5,.42));mask=Image.new('L',(w,h),0);ImageDraw.Draw(mask).rounded_rectangle((0,0,w-1,h-1),radius=10,fill=255);canvas.paste(im,(x,y),mask)
with tempfile.TemporaryDirectory(prefix='hero-original-motion-') as d:
    tmp=Path(d);a=Image.new('RGBA',(1280,720),(0,0,0,0));b=a.copy()
    # Text-bearing panels and sports panels are intentionally left transparent.
    for name,box in [('series-silo.jpg',(490,278,300,164)),('film-resident.jpg',(22,452,768,246)),('series-knight.jpg',(800,362,458,336))]:tile(a,name,box)
    for name,box in [('film-cycle.jpg',(22,22,242,450)),('series-pitt.jpg',(534,22,724,220)),('series-vision.jpg',(534,254,210,219)),('film-odyssey.jpg',(22,484,200,214)),('series-sherlock.jpg',(234,484,510,214))]:tile(b,name,box)
    a.save(tmp/'a.png');b.save(tmp/'b.png')
    flt=("[0:v]fps=30,format=rgba[hero];"
         "[1:v]format=rgba,fade=t=in:st=5:d=0.3:alpha=1,fade=t=out:st=8.65:d=0.3:alpha=1[a];"
         "[2:v]format=rgba,fade=t=in:st=10:d=0.3:alpha=1,fade=t=out:st=13.05:d=0.3:alpha=1[b];"
         "[hero][a]overlay=0:0:shortest=1[h];[h][b]overlay=0:0:shortest=1,scale=960:540,setsar=1,format=yuv420p,fade=t=out:st=15.55:d=0.4,setpts=PTS-STARTPTS[base];"
         "[3:v]fps=30,scale=960:540,setsar=1,format=yuv420p,fade=t=in:st=0:d=0.4,setpts=PTS-STARTPTS[extra];[base][extra]concat=n=2:v=1:a=0[v]")
    subprocess.run([ff,'-hide_banner','-loglevel','error','-i',str(original),'-loop','1','-framerate','30','-t','16','-i',str(tmp/'a.png'),'-loop','1','-framerate','30','-t','16','-i',str(tmp/'b.png'),'-i',str(append),'-filter_complex',flt,'-map','[v]','-an','-c:v','libx264','-preset','veryfast','-crf','22','-movflags','+faststart','-y',str(out)],check=True)
    print('Finished:',out,flush=True)
