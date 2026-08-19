import json,os,sys,time,urllib.parse,urllib.request,jwt
sa=json.loads(os.environ["GOOGLE_SA_JSON"]); now=int(time.time())
signed=jwt.encode({"iss":sa["client_email"],"scope":"https://www.googleapis.com/auth/siteverification https://www.googleapis.com/auth/webmasters","aud":sa["token_uri"],"iat":now,"exp":now+3600},sa["private_key"],algorithm="RS256")
tok=json.loads(urllib.request.urlopen(urllib.request.Request(sa["token_uri"],data=urllib.parse.urlencode({"grant_type":"urn:ietf:params:oauth:grant-type:jwt-bearer","assertion":signed}).encode())).read())["access_token"]
r=urllib.request.urlopen(urllib.request.Request("https://www.googleapis.com/siteVerification/v1/webResource",headers={"Authorization":"Bearer "+tok})).read().decode()
print(r)
