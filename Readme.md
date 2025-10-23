# Gitub
git init
ssh-keygen -t ed25519 -C "contact@sobox.fr"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
ssh -T git@github.com
ssh-add -l
git remote -v
git remote set-url origin git@github.com:VDB06500/sobox.git

git init

git add .gitignore
git commit -m"Maj projet"
git push -u origin main

