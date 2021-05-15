#!/bin/sh

#netlify deploy  --dir=dist/
#netlify deploy --prod  --dir=dist/

#HOST=set env variable

cd dist
rsync -vhrzO --no-perms --no-owner --no-group --checksum * $HOST:/var/www/html/md/
