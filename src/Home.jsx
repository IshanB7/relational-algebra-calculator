import { useState, useEffect } from "react";
import "./App.css"

function Home() {
    const [text, setText] = useState("Employees (EID, Name, Age) = {\nE1, John, 32\nE2, Alice, 28\nE3, Bob, 29\n}\n\nManagers (MID, Name, Age) = {\nM1, Jacob, 32\nM2, Bob, 29\nM3, Gwen, 28\n}");
    useEffect(() => {
        setRelations(parseRelations(text));
    }, [text]);


    const [relations, setRelations] = useState({});
    const [query, setQuery] = useState("select Age>30(Employees)");
    const [results, setResults] = useState(null);

    function handleChange(e) {
        setText(e.target.value);
    }

    function parseRelations(input) {
        if (input === "") return {};
        const lines = input.trim().split("\n");
        const parsedRelations = {};

        let i;

        for (i = 0; i < lines.length; ) {
            const header = lines[i].split(/\s+/).map((item) => {
                return item.replace(/[(),]+/g, "");
            });
            parsedRelations[header[0]] = {};
            for (let j = 1; j < header.length; ++j) {
                if (header[j] === "=") break;
                parsedRelations[header[0]][header[j]] = [];
            }

            for (i = i+1; i < lines.length; ++i) {
                if (lines[i] === "}") {
                    ++i;
                    while (lines[i] === "") ++i;
                    break;
                }

                lines[i] = lines[i].trim().replace(/["]/g, "").split(",").map((item) => item.trim());
                for (let j = 1; j < header.length; ++j) {
                    if (header[j] === "=") break;
                    parsedRelations[header[0]][header[j]].push(lines[i][j-1]);
                }
            }
        }
        return parsedRelations;
    }

    function handleQuery(e) {
        setQuery(e.target.value);
    }

    function parseQuery(input) {
        input = input.replace(/\((\w+)\)/g, ' $1 ');
        const line = input.replace(/(\(|\))/g, " $1 ").trim().split(/\s+/);
        let queryArray = [];
        let queryObject = {};
        queryObject["from"] = [];

        for (let each of line) {
            if ((each === "(" || each === ")")) {
                if (queryObject.hasOwnProperty("operation")) {
                    queryArray.push(queryObject);
                    queryObject = {};
                    queryObject["from"] = [];
                }
                continue;
            }

            if (relations.hasOwnProperty(each)) {
                queryObject.from.push(each);
            } else {
                let op = false;
                switch (each) {
                    case "select":
                    case "project":
                    case "join":
                    case "ljoin":
                    case "rjoin":
                    case "ojoin":
                    case "union":
                    case "intersect":
                    case "minus":
                        if (queryObject.hasOwnProperty("operation")) {
                            queryArray.push(queryObject);
                            queryObject = {};
                            queryObject["from"] = [];
                        }
                        queryObject["operation"] = each;
                        op = true;
                        break;
                    default:
                        break;
                }

                if (!op) {
                    each = each.replace(/[,]/g, " ").trim();
                    each = each.replace(/(!=|=|<|>|<=|>=)/g, " $1 ").trim();
                    let split = each.split(/\s+/g);

                    if (each.match(/[<>!=]/)) {
                        if (!queryObject.hasOwnProperty("where")) {
                            queryObject["where"] = [];
                        }
                        for (let i = 2; i < split.length; i+=3) {
                            queryObject["where"].push({
                                "field": split[i-2],
                                "operator": split[i-1],
                                "value": split[i]
                            });
                        }
                    } else {
                        if (!queryObject.hasOwnProperty("field")) {
                            queryObject["field"] = [];
                        }
                        for (let x of split) {
                            queryObject["field"].push(x);
                        }
                    }
                }
            }

            if (queryObject.operation === "select" || queryObject.operation === "project") {
                if (queryObject.from.length === 1) {
                    queryArray.push(queryObject);
                    queryObject = {};
                    queryObject["from"] = [];
                }

            } else if (queryObject.from.length === 2) {
                queryArray.push(queryObject);
                queryObject = {};
                queryObject["from"] = [];
            }
        }
        if (Object.keys(queryObject).length > 0) {
            let empty = true;
            for (let each of Object.keys(queryObject)) {
                if (queryObject[each].length > 0) {
                    empty = false;
                    break;
                }
            }

            if (!empty) queryArray.push(queryObject);
        }
        return queryArray;
    }

    function processQuery(queryArr) {
        let queryObj;
        let prev;

        for (let i = queryArr.length-1; i >= 0; --i) {
            queryObj = queryArr[i];

            if (queryObj.operation === "select" || queryObj.operation === "project") {
                let result = {};
                if (queryObj.from.length === 1) {
                    result = JSON.parse(JSON.stringify(relations[queryObj.from[0]]));
                } else {
                    result = prev;
                }

                if (queryObj.operation === "select") {
                    let toDelete = {};
                    if (queryObj.hasOwnProperty("where")) {
                        for (let each in result) {
                            for (let where of queryObj.where) {
                                if (each === where.field) {
                                    for (let i = 0; i < result[each].length; ++i) {
                                        switch(where.operator) {
                                            case "!=":
                                                if (result[each][i] == where.value) {
                                                    toDelete[i] = true;
                                                }   
                                                break;
                                            case "=":
                                                if (result[each][i] != where.value) {
                                                    toDelete[i] = true;
                                                }
                                                break;
                                            case ">":
                                                if (result[each][i] <= where.value) {
                                                    toDelete[i] = true;
                                                }
                                                break;
                                            case "<":
                                                if (result[each][i] >= where.value) {
                                                    toDelete[i] = true;
                                                }
                                                break;
                                            case ">=":
                                                if (result[each][i] < where.value) {
                                                    toDelete[i] = true;
                                                }
                                                break;
                                            case "<=":
                                                if (result[each][i] > where.value) {
                                                    toDelete[i] = true;
                                                }
                                                break;
                                            default:
                                                break;
                                        }
                                    }
                                }
                            }
                        }
                        let keys = Object.keys(toDelete);
                        for (let each in result) {
                            for (let i=keys.length-1; i>=0; --i) {
                                result[each].splice(keys[i], 1);
                            }
                        }
                    }
                } else {
                    if (queryObj.hasOwnProperty("field")) {
                        for (let each in result) {
                            let match = false
                            for (let field of queryObj.field) {
                                if (each === field) {
                                    match = true;
                                    break;
                                }
                            }
                            if (!match) delete result[each];
                        }
                    }
                }
                prev = result;
            } else if (queryObj.operation.match(/join/)) {
                let table1, table2;
                if (queryObj.from.length < 2) {
                    table1 = JSON.parse(JSON.stringify(relations[queryObj.from[0]]));
                    table2 = prev;
                } else {
                    table1 = JSON.parse(JSON.stringify(relations[queryObj.from[[0]]]));
                    table2 = JSON.parse(JSON.stringify(relations[queryObj.from[[1]]]));
                }

                let result = {}
                if (queryObj.hasOwnProperty("where")) {
                    let where = queryObj.where[0];
                    for (let field1 in table1) result[field1] = [];
                    for (let field2 in table2) result[field2] = [];

                    if (queryObj.operation === "join") {
                        for (let i=0; i<table1[where.field].length; ++i) {
                            for (let j=0; j<table2[where.value].length; ++j) {
                                if (table1[where.field][i] === table2[where.value][j]) {

                                    for (let field1 in table1) {
                                        result[field1].push(table1[field1][i]);
                                    }

                                    for (let field2 in table2) {
                                        if (!table1.hasOwnProperty(field2)) {
                                            result[field2].push(table2[field2][j]);
                                        }
                                    }
                                }
                            }
                        }
                    } else if (queryObj.operation === "ljoin") {
                        for (let i=0; i<table1[where.field].length; ++i) {
                            let match = false;
                            for (let j=0; j<table2[where.value].length; ++j) {
                                if (table1[where.field][i] === table2[where.value][j]) {
                                    match = true;
                                    for (let field1 in table1) {
                                        result[field1].push(table1[field1][i]);
                                    }

                                    for (let field2 in table2) {
                                        if (!table1.hasOwnProperty(field2)) {
                                            result[field2].push(table2[field2][j]);
                                        }
                                    }
                                }
                            }
                            if (!match) {
                                for (let field in result) {
                                    if (table1.hasOwnProperty(field)) {
                                        result[field].push(table1[field][i]);
                                    } else {
                                        result[field].push(null);
                                    }
                                }
                            }
                        }
                    } else if (queryObj.operation === "rjoin") {
                        for (let j=0; j<table2[where.value].length; ++j) {
                            let match = false;
                            for (let i=0; i<table1[where.field].length; ++i) {
                                if (table1[where.field][i] === table2[where.value][j]) {
                                    match = true;
                                    for (let field1 in table1) {
                                        result[field1].push(table1[field1][i]);
                                    }

                                    for (let field2 in table2) {
                                        if (!table1.hasOwnProperty(field2)) {
                                            result[field2].push(table2[field2][j]);
                                        }
                                    }
                                }
                            }
                            if (!match) {
                                for (let field in result) {
                                    if (table2.hasOwnProperty(field)) {
                                        result[field].push(table2[field][j]);
                                    } else {
                                        result[field].push(null);
                                    }
                                }
                            }
                        }
                    }
                } else {
                    let duplicate;
                    for (let field1 in table1) result[field1] = [];
                    for (let field2 in table2) {
                        if (result.hasOwnProperty(field2)) duplicate = field2;
                        result[field2] = [];
                    }

                    for (let i=0; i<table1[duplicate].length; ++i) {
                        for (let j=0; j<table2[duplicate].length; ++j) {
                            if (table1[duplicate][i] === table2[duplicate][j]) {
                                for (let field1 in table1) {
                                    result[field1].push(table1[field1][i]);
                                }
                                for (let field2 in table2) {
                                    if (!table1.hasOwnProperty(field2)) {
                                        result[field2].push(table2[field2][j]);
                                    }
                                }
                            }
                        }
                    }                 
                } 
                prev = result;
            } else {
                let table1, table2;
                if (queryObj.from.length < 2) {
                    table1 = JSON.parse(JSON.stringify(relations[queryObj.from[[0]]]));
                    table2 = prev;
                } else {
                    table1 = JSON.parse(JSON.stringify(relations[queryObj.from[[0]]]));
                    table2 = JSON.parse(JSON.stringify(relations[queryObj.from[[1]]]));
                }

                if (Object.keys(table1).length === Object.keys(table2).length) {
                    let result = {};
                    for (let i=0; i<Object.keys(table1).length; ++i) result[i] = [];

                    if (queryObj.operation === "union") {
                        let keys = Object.keys(table1);
                        for (let i=0; i<table1[keys[0]].length; ++i) {
                            let match = true;
                            for (let j=0; j<keys.length; ++j) {
                                if (!result[j].includes(table1[keys[j]][i])) {
                                    match = false;
                                    break;
                                }
                            }
                            if (!match) {
                                for (let j=0; j<keys.length; ++j) {
                                    result[j].push(table1[keys[j]][i]);
                                }
                            }
                        }

                        keys = Object.keys(table2);
                        for (let i=0; i<table2[keys[0]].length; ++i) {
                            let match = true;
                            for (let j=0; j<keys.length; ++j) {
                                if (!result[j].includes(table2[keys[j]][i])) {
                                    match = false;
                                    break;
                                }
                            }
                            if (!match) {
                                for (let j=0; j<keys.length; ++j) {
                                    result[j].push(table2[keys[j]][i]);
                                }
                            }
                        }
                    } else if (queryObj.operation === "intersect") {
                        let keys1 = Object.keys(table1);
                        let keys2 = Object.keys(table2);

                        for (let i = 0; i < table1[keys1[0]].length; ++i) {
                            let tuple1 = keys1.map((key) => table1[key][i]);
                            let isCommon = false;
                            for (let j = 0; j < table2[keys2[0]].length; ++j) {
                                let tuple2 = keys2.map((key) => table2[key][j]);
                                if (JSON.stringify(tuple1) === JSON.stringify(tuple2)) {
                                    isCommon = true;
                                    break;
                                }
                            }

                            if (isCommon) {
                                for (let j = 0; j < keys1.length; ++j) {
                                    result[j].push(tuple1[j]);
                                }
                            }
                        }
                    } else {
                        let keys1 = Object.keys(table1);
                        let keys2 = Object.keys(table2);

                        for (let i = 0; i < table1[keys1[0]].length; ++i) {
                            let tuple1 = keys1.map((key) => table1[key][i]);
                            let isCommon = false;
                            for (let j = 0; j < table2[keys2[0]].length; ++j) {
                                let tuple2 = keys2.map((key) => table2[key][j]);
                                if (JSON.stringify(tuple1) === JSON.stringify(tuple2)) {
                                    isCommon = true;
                                    break;
                                }
                            }
                            if (!isCommon) {
                                for (let j = 0; j < keys1.length; ++j) {
                                    result[j].push(tuple1[j]);
                                }
                            }
                        }
                    }
                    prev = result;
                }
            }
        }
        setResults(prev);
        return prev;
    }

    return (
        <>
            <textarea
                value = {text}
                onChange = {handleChange}
                style = {{width: '100%', height: '400px'}}
            />
            <br /> <br />   

            <input 
                id = "query"
                type = "text"
                value = {query}
                style = {{width: '100%'}}
                onChange = {handleQuery}
            />
            <br /> <br />   

            <button onClick = {() => processQuery(parseQuery(query))}> Submit </button>

            {results && (
                <div style={{ paddingTop: "20px"}}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                    <tr>
                        {Object.keys(results).map((header) => (
                        <th key={header}>{header}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {results[Object.keys(results)[0]].map((_, rowIndex) => (
                        <tr key={rowIndex}>
                        {Object.keys(results).map((header, colIndex) => (
                            <td key={colIndex}>{results[header][rowIndex]}</td>
                        ))}
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            )}
        </>
    )
}

export default Home;