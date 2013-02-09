(: A try/catch expression catches dynamic errors and type errors raised during dynamic evaluation for expressions that are lexically contained within the try clause. If the target expression does not raise a dynamic error or a type error, the result of the try/catch expression is the result of the target expression. 
replace with example from movie :)

(:
describe each quickfix in the beginning at popup

text description instead of code preview
dont propose anonymous import next to other imports
dont propose anonymous import on builtin prefix rename
run positioner on ast be4 quickfixing

:)

declare namespace err = "http://www.w3.org/2005/xqt-errors";
declare variable $error := xs:QName("err:FOER0000");
declare variable $unused := 1;
try { fn:error($error, "An Error Happened") }
catch err:FOER0000 { concat($err:code, ": ", $err:description, " at ", $err:module, "(",         $err:line-number, ",", $err:column-number, ")") }