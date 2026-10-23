#!/usr/bin/env bash
set -u
cd "$(dirname "$0")"
source .env

docker compose up -d --build

echo "Esperando al gateway..."
for i in $(seq 1 40); do
  curl -fs localhost:8000/health >/dev/null 2>&1 && break
  sleep 1
done

G=localhost:8000
J='Content-Type: application/json'
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

check() {
  desc=$1; esperado=$2; shift 2
  code=$(curl -s -o /dev/null -w "%{http_code}" "$@" || true)
  if [ "$code" = "$esperado" ]; then echo "OK    $desc ($code)"
  else echo "FALLA $desc (esperado $esperado, obtuvo $code)"; fi
}

echo "--- Sin sesión ---"
check "auth/me sin cookie"        401 $G/auth/me
check "api/products sin cookie"   401 $G/api/products
check "login incorrecto"          401 -X POST -H "$J" -d '{"username":"ana","password":"incorrecta"}' $G/auth/login
check "login con Origin hostil"   403 -X POST -H "$J" -H "Origin: http://evil.example" -d '{"username":"ana","password":"1234"}' $G/auth/login

echo "--- Ana (user) ---"
check "login ana"                 200 -c $TMP/ana.jar -X POST -H "$J" -d '{"username":"ana","password":"1234"}' $G/auth/login
check "auth/me"                   200 -b $TMP/ana.jar $G/auth/me
check "api/products"              200 -b $TMP/ana.jar $G/api/products
check "api/orders"                200 -b $TMP/ana.jar $G/api/orders
check "DELETE como user"          403 -b $TMP/ana.jar -X DELETE $G/api/products/1
check "ruta no expuesta"          404 -b $TMP/ana.jar $G/api/noexiste
check "path traversal"            400 --path-as-is -b $TMP/ana.jar $G/api/../health
cp $TMP/ana.jar $TMP/ana_old.jar
check "logout"                    200 -b $TMP/ana.jar -c $TMP/ana.jar -X POST $G/auth/logout
check "cookie vieja tras logout"  401 -b $TMP/ana_old.jar $G/auth/me

echo "--- Ernesto (admin) ---"
check "login ernesto"             200 -c $TMP/ern.jar -X POST -H "$J" -d '{"username":"ernesto","password":"admin123"}' $G/auth/login
check "DELETE como admin"         200 -b $TMP/ern.jar -X DELETE $G/api/products/1
check "DELETE id inexistente"     404 -b $TMP/ern.jar -X DELETE $G/api/products/999
check "logout ernesto"            200 -b $TMP/ern.jar -c $TMP/ern.jar -X POST $G/auth/logout

echo "--- Aislamiento de red ---"
check "backend directo"           000 localhost:9000/products
check "auth directo"              000 localhost:8100/health
