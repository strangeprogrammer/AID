#!`which sh`

readmodules(){
	ls ./modules/ | while read MODULE; do
		TARGET='./modules/'${MODULE}
		cat <<EOF
makeMod((() => {
  // Module: ${MODULE}
  // Initially: `cat ${TARGET}/Initially.js 2>/dev/null || echo -n true`
  // Preload
`cat ${TARGET}/Preload.js 2>/dev/null`
  // Library
`cat ${TARGET}/Library.js 2>/dev/null`
  // Input
`cat ${TARGET}/Input.js 2>/dev/null`
  // Context
`cat ${TARGET}/Context.js 2>/dev/null`
  // Output
`cat ${TARGET}/Output.js 2>/dev/null`
  // End
}).toString())

EOF
		#sed -n '/TRIGGER/s/\(.*\)/\1/g;t append;p;b;:append;x;s/.*/FOUND/g;p;x;p' -
	done
}

ACCUM=`readmodules` # TODO: Use a different assignment scheme since this removes *all* newlines from the contents

echo -n ${ACCUM}
