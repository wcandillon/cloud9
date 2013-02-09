(:
1. demo.xq
http:send-request() 

qf error -> import module (quickly)
explain about quickfixes, revert, show again slowly

2. demo2.xq 
explain issues, show and explain available quickfixes for each, explain use of static analysis
apply/revert quickfixes separately



:)


(:
 : 1.
 : import module namespace lib = "http://expath.org/ns/http-client";
 : http:send-request((), "28.io")
 :
 : quickfix warning -> change to http
 : revert
 : quickfix error -> change to lib
 : revert
 : quickfix error -> change unused ns to http
 :
 : DELETE ALL
 :
 : 2.
 : http:send-reques((), "28.io"
 :
 : quickfix error -> import module http
 : revert
 : fix typo
 : quickfix error -> import expath module
 :
 : DELETE 2nd line only
 :
 : 3.
 : import module namespace http = "http://expath.org/ns/http-client";
 :
 :   let $node:=
 :   <node>hello!</node>
 :
 :  return  asd:data ($node )
 :
 : quickfix error -> change to fn
 : ask about skills
 : format
 : quickfix warning
 :
 :
 :)