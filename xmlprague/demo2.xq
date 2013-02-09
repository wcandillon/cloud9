import module namespace lib = "http://expath.org/ns/http-client";
import module namespace lib2 = "unused.org";


let $result := http:send-request(<http:request method="GET"
href="http://search.twitter.com/search.json?q=xmlprague&amp;lang=en"
                  override-media-type="text/plain" />)[2] !
jn:parse-json(.) ! .("results") ! jn:member(.)
for $token in ft:tokenize-node($result)
group by $token
count $count
return {
  "token": $token,
  "count": $count
}

