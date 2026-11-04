import json, http.server, socketserver, urllib.parse, os
M3U = "#EXTM3U\n" + "".join(f'#EXTINF:-1 tvg-logo="http://127.0.0.1:8765/logo.png",Canal {i}\nhttp://127.0.0.1:8765/video.mp4?n={i}\n' for i in range(1,2501)) + "Carpeta | http://127.0.0.1:8765/sub.m3u\n"
SRT = "1\n00:00:01,000 --> 00:00:03,000\nHola <i>mundo</i>\n\n2\n00:00:04,000 --> 00:00:06,000\nSegunda línea\n"
class H(http.server.BaseHTTPRequestHandler):
    def _s(self, code, body, ct="text/plain; charset=utf-8", cors=True):
        b = body.encode() if isinstance(body,str) else body
        self.send_response(code); self.send_header("Content-Type", ct); self.send_header("Content-Length", str(len(b)))
        if cors: self.send_header("Access-Control-Allow-Origin","*")
        self.end_headers(); self.wfile.write(b)
    def log_message(self,*a): pass
    def do_GET(self):
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        if u.path=="/lista.m3u": return self._s(200, M3U)
        if u.path=="/sub.m3u": return self._s(200, "#EXTM3U\n#EXTINF:-1,Dentro 1\nhttp://127.0.0.1:8765/video.mp4\n")
        if u.path=="/sub.srt": return self._s(200, SRT)
        if u.path=="/sin_cors.txt": return self._s(200, "hola", cors=False)
        if u.path=="/desafio.php": return self._s(200, '<html><script src="/aes.js"></script><script>document.cookie="__test="+toHex(slowAES.decrypt())</script></html>', "text/html")
        if u.path=="/video.mp4" and os.path.exists("v.webm"):
            d=open("v.webm","rb").read(); rg=self.headers.get("Range")
            if rg and rg.startswith("bytes="):
                a,_,z=rg[6:].partition("-"); a=int(a or 0); z=int(z) if z else len(d)-1; part=d[a:z+1]
                self.send_response(206); self.send_header("Content-Type","video/webm"); self.send_header("Content-Length",str(len(part)))
                self.send_header("Content-Range",f"bytes {a}-{z}/{len(d)}"); self.send_header("Accept-Ranges","bytes"); self.send_header("Access-Control-Allow-Origin","*")
                self.end_headers(); self.wfile.write(part); return
            self.send_response(200); self.send_header("Content-Type","video/webm"); self.send_header("Content-Length",str(len(d))); self.send_header("Accept-Ranges","bytes"); self.send_header("Access-Control-Allow-Origin","*"); self.end_headers(); self.wfile.write(d); return
        if u.path=="/player_api.php":
            if q.get("password",[""])[0]!="bien": return self._s(200, json.dumps({"user_info":{"auth":0}}))
            a = q.get("action",[""])[0]
            if a=="": return self._s(200, json.dumps({"user_info":{"auth":1}}))
            if a=="get_live_categories": return self._s(200, json.dumps([{"category_id":"1","category_name":"Noticias"}]))
            if a=="get_live_streams": return self._s(200, json.dumps([{"stream_id":77,"name":"TV Uno","stream_icon":""}]))
            if a=="get_series": return self._s(200, json.dumps([{"series_id":5,"name":"Serie X","cover":""}]))
            if a=="get_series_info": return self._s(200, json.dumps({"info":{"cover":"c.png"},"episodes":{"2":[{"id":"21","season":2,"episode_num":1,"title":"B","container_extension":"mkv"}],"1":[{"id":"11","season":1,"episode_num":2,"title":"A","container_extension":"mp4"}]}}))
            return self._s(200,"[]")
        if u.path=="/leer.php":
            t=q.get("titulo",[""])[0]; return self._s(200, "#EXTM3U\n#EXTINF:-1,Desde buddy\nhttp://127.0.0.1:8765/video.mp4\n" if t=="ok" else "ERROR no existe")
        self._s(404,"no")
    def do_POST(self):
        n=int(self.headers.get("Content-Length",0)); body=self.rfile.read(n).decode()
        if self.path=="/guardar.php":
            d=urllib.parse.parse_qs(body); open("guardado.txt","w").write(json.dumps(d)); return self._s(200,"OK")
        self._s(404,"no")
    def do_OPTIONS(self):
        self.send_response(204); self.send_header("Access-Control-Allow-Origin","*"); self.send_header("Access-Control-Allow-Headers","*"); self.end_headers()
class T(socketserver.ThreadingTCPServer): allow_reuse_address=True
T(("127.0.0.1",8765),H).serve_forever()
