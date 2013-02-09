import module namespace lib = "unused.org";
import module namespace lib2 = "http://expath.org/ns/http-client";


let $request := 
    <http:request method="GET"
        href="http://search.twitter.com/search.json?q=xmlprague&amp;lang=en"
        override-media-type="text/plain" 
    />
let $result := http:send-request($request)[2] ! jn:parse-json(.) ! .("results") 
    ! jn:member(.)
for $token in ft:tokenize-node($result)
group by $token
count $count
return {
  "token": $token,
  "count": $count
}

