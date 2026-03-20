[
    {
    key: "4_8_1/14/2025",
    values: [
            {
        subscriptionId: "1005",
        customerId: "4",
            },
            {
        subscriptionId: "1006",
        customerId: "4",
            }
        ]
    },
    {
    key: "4_7_2/18/2025",
    values: [
            {
        subscriptionId: "1007",
        customerId: "4",
            }
        ]
    }
]


//Converts Object into Array:
var object = {
    "key1": "value1",
    "key2": [],
    "key3": []
};

var array = Object.keys(grouped).map(key => ({
  key: key,
  values: grouped[key
    ]
}));

//Output: [{ key: "key1", values: "value1" }, { key: "key1", values: [] }, { key: "key1", values: [] }]