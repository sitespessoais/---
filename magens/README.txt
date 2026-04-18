Pasta MAGENS — álbum do site
============================

Pelo site, as fotos novas ficam no INDEXEDDB de cada navegador (não precisa de
npm). Este manifest + arquivos aqui servem pra pré-carregar fotos no álbum
quando você usa Live Server ou um servidor estático.

Opcional: server.js na raiz pode gravar uploads direto nesta pasta (PC
ligado). Veja REMOTO.txt.

Como usar
---------

A) Só abrir o index.html (ou mandar por WhatsApp, etc.): novas fotos ficam no
   browser (IndexedDB), não nesta pasta.

B) Se você quer que o site grave aqui na pasta ao adicionar fotos: rode na raiz do
   projeto  npm start  ou  node server.js  e abra http://localhost:3789/

C) Na mão: copie .jpg/.png pra magens/ e edite manifest.json (id, file, title,
   description, date, location).

Nota: o manifest.json não carrega em file://; use Live Server ou o servidor do
item B pra ver essas entradas no álbum.
