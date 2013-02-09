(: Complex FLWOR - preemptive wrapping :)


<result>{
    for $sales in doc("sales-records.xml")/*/record
    let $state := doc("stores.xml")/*/store,
        $product := doc("products.xml")/*/product[name = $sales/product-name],
        $category := $product/category,
        $revenue := $sales/qty * $product/price
    group by $state, $category
    order by $state, $category
    return
      <group>
        { $state, $category }
        <total-revenue>{ sum($revenue) }</total-revenue>
      </group>
}</result>