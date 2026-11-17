"""Substitute the unlabelled opening pictures while retaining the source wipes and timing."""
from pathlib import Path
import subprocess,sys,tempfile
import numpy as np
from PIL import Image,ImageOps,ImageDraw
root=Path(__file__).resolve().parents[2];ff=sys.argv[1];original=root/'home-preview/hero-video-preview/hero-original-source.mp4';previous=root/'home-preview/hero-video-preview/hero-original-motion-preview.mp4';layers=root/'home-preview/saved-reference/assets/cinema-layers';out=root/'home-preview/hero-video-preview/hero-opening-motion-preview.mp4'
W,H=1280,720;fps=30;duration=3.8; count=round(duration*fps)
# Templates are source-video frames. Their horizontal scanlines identify which
# original picture is visible, so the original horizontal wipe survives.
refs=[(.1,'series-earlyspring.jpg'),(2.5,'series-starcity.jpg'),(.75,'film-cycle.jpg'),(1.1,'film-tenzing.jpg'),(1.6,'series-dragon.jpg'),(2.0,'film-resident.jpg')]
with tempfile.TemporaryDirectory(prefix='opening-motion-') as folder:
    tmp=Path(folder);templates=[];pictures=[]
    for i,(time,name) in enumerate(refs):
        path=tmp/f'ref{i}.png';subprocess.run([ff,'-hide_banner','-loglevel','error','-ss',str(time),'-i',str(original),'-frames:v','1','-y',str(path)],check=True)
        templates.append(np.asarray(Image.open(path).convert('RGB'),dtype=np.int16))
        image=Image.open(layers/name).convert('RGB');image=ImageOps.fit(image,(1236,676),method=Image.Resampling.LANCZOS,centering=(.5,.42));pictures.append(np.asarray(image))
    templates=np.stack(templates);pictures=np.stack(pictures)
    # Exclude the rounded frame corners and preserve the original pink wipe.
    mask=Image.new('L',(1236,676),0);ImageDraw.Draw(mask).rounded_rectangle((0,0,1235,675),radius=10,fill=255);rounded=np.asarray(mask)>0
    decoder=subprocess.Popen([ff,'-hide_banner','-loglevel','error','-i',str(original),'-t',str(duration),'-vf','fps=30','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
    first=tmp/'opening.mp4';encoder=subprocess.Popen([ff,'-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(fps),'-i','-','-an','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-y',str(first)],stdin=subprocess.PIPE)
    for i in range(count):
        data=decoder.stdout.read(W*H*3)
        if len(data)!=W*H*3:raise RuntimeError('source decoder ended unexpectedly')
        frame=np.frombuffer(data,dtype=np.uint8).reshape((H,W,3)).copy();t=i/fps
        if t<2.88:
            # The original slideshow wipes horizontally; select a source per row.
            current=frame[22:698,22:1258];source=templates[:,22:698,22:1258]
            dist=np.abs(source[:,:,::16,:]-current[None,:,::16,:].astype(np.int16)).mean(axis=(2,3))
            winners=dist.argmin(axis=0);best=dist.min(axis=0)
            for y in range(676):
                # Leave unmatched rows (the pink wipe, black frame, etc.) intact.
                row=current[y].astype(np.int16)
                pink=((row[:,0]>190)&(row[:,1]>160)&(row[:,0]-row[:,1]>7)&(row[:,0]-row[:,1]<35)&(abs(row[:,1]-row[:,2])<15)).mean()>.6
                if best[y]<32 and not pink:
                    current[y,rounded[y]]=pictures[winners[y],y,rounded[y]]
        else:
            # In the original video the last full-frame card shrinks toward centre.
            # Track its bounds on black and fit the corresponding new scene inside.
            brightness=frame.max(axis=2);rows=np.flatnonzero((brightness>24).sum(axis=1)>10);cols=np.flatnonzero((brightness>24).sum(axis=0)>10)
            if len(rows) and len(cols):
                y0,y1=rows[0],rows[-1]+1;x0,x1=cols[0],cols[-1]+1;w=x1-x0;h=y1-y0
                if w>20 and h>15:
                    image=Image.open(layers/'series-starcity.jpg').convert('RGB');image=ImageOps.fit(image,(w,h),method=Image.Resampling.LANCZOS,centering=(.5,.42));m=Image.new('L',(w,h),0);ImageDraw.Draw(m).rounded_rectangle((0,0,w-1,h-1),radius=max(2,round(10*w/1236)),fill=255);composite=Image.fromarray(frame);composite.paste(image,(x0,y0),m);frame=np.asarray(composite)
        encoder.stdin.write(frame.tobytes())
    decoder.stdout.close();encoder.stdin.close()
    if encoder.wait()!=0:raise RuntimeError('opening encoder failed')
    decoder.wait()
    # Everything after the modified opening comes from the existing preview:
    # its original hero motion, sports and labelled pictures stay intact.
    flt='[0:v]fps=30,scale=960:540,setsar=1,format=yuv420p,setpts=PTS-STARTPTS[a];[1:v]fps=30,scale=960:540,setsar=1,format=yuv420p,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0[v]'
    subprocess.run([ff,'-hide_banner','-loglevel','error','-i',str(first),'-ss',str(duration),'-i',str(previous),'-filter_complex',flt,'-map','[v]','-an','-c:v','libx264','-preset','veryfast','-crf','22','-movflags','+faststart','-y',str(out)],check=True)
    print('Finished:',out,flush=True)
