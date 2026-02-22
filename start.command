#!/bin/zsh
cd /Users/hk/projects/qr-order || exit 1
npm run dev &
sleep 4
open "http://localhost:3000/order?store=demo-store&table=3"
open "http://localhost:3000/kitchen?store=demo-store"
open "http://localhost:3000/admin?store=demo-store"
wait
