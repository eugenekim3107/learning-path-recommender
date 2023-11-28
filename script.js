document.getElementById('topicForm').addEventListener('submit', function(event) {
    event.preventDefault();

    document.getElementById('loadingIndicator').style.display = 'flex';

    const topic = document.getElementById('topicInput').value;
    fetch('http://127.0.0.1:8000/create_exam', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: topic })
    })
    .then(response => response.json())
    .then(data => {
        const exam = JSON.parse(data.exam);
        const examContent = document.getElementById('examContent');
        examContent.innerHTML = '';

        let answeredQuestions = 0;
        const correctSubtopics = new Set();
        const incorrectSubtopics = new Set();
        const answersBySubtopic = {};
        const totalQuestions = Object.keys(exam).filter(key => key.startsWith('exam')).length;

        Object.keys(exam).forEach(key => {
            if (key.startsWith('exam')) {
                const question = exam[key];
                const subtopic = exam[`subtopic${key.match(/\d+/)[0]}`].question_statement;
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question';

                if (!answersBySubtopic[subtopic]) {
                    answersBySubtopic[subtopic] = [];
                }

                const questionStatement = document.createElement('p');
                questionStatement.textContent = question.question_statement;
                questionDiv.appendChild(questionStatement);

                question.options.forEach(option => {
                    const button = document.createElement('button');
                    button.textContent = option;

                    button.addEventListener('click', () => {
                        if (!button.classList.contains('answered')) {
                            button.classList.add('answered');
                            answeredQuestions++;
                            if (answeredQuestions === totalQuestions) {
                                createTreeButton.disabled = false;
                            }
                        }

                        questionDiv.querySelectorAll('button').forEach(btn => btn.disabled = true);
                        const questionNumber = key.match(/\d+/)[0];
                        const correctAnswer = exam[`answer${questionNumber}`].question_statement;

                        button.style.backgroundColor = button.textContent === correctAnswer ? 'green' : 'red';
                        const isCorrect = button.textContent === correctAnswer;
                        if (isCorrect) {
                            correctSubtopics.add(subtopic); // Add the subtopic name to the set
                        }
                        else {
                            incorrectSubtopics.add(subtopic)
                        }
                        answersBySubtopic[subtopic].push(isCorrect);
                    });

                    questionDiv.appendChild(button);
                });

                examContent.appendChild(questionDiv);
            }
        });

        const createTreeButton = document.createElement('button');
        createTreeButton.id = 'createTreeButton'; // Add this line to set the id
        createTreeButton.textContent = 'Create Learning Topic Tree';
        createTreeButton.disabled = true;
        createTreeButton.addEventListener('click', () => {
            // Use answersBySubtopic here for POST request
            const postData = {
                mainTopic: topic,
                subtopics: Object.keys(answersBySubtopic).map(subtopic => ({
                    name: subtopic,
                    answers: answersBySubtopic[subtopic]
                }))
            };

            // Making the POST request
            fetch('http://127.0.0.1:8000/generate_learning_tree', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData)
            })
            .then(response => response.json())
            .then(data => {
                let treeData = d3.hierarchy(JSON.parse(data.tree))

                // Set the dimensions and margins of the diagram
                var margin = {top: 100, right: 100, bottom: 100, left: 100},
                width = 1000 - margin.left - margin.right,
                height = 1000 - margin.top - margin.bottom;

                // Append the svg object to the body of the page
                var svg = d3.select("#treeContainer").append("svg")
                .attr("width", width + margin.right + margin.left)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate("
                    + margin.left + "," + margin.top + ")");

                // Declares a tree layout and assigns the size
                var treemap = d3.tree()
                .size([height, width]);

                var rootNode = d3.hierarchy(treeData, function(d) {return d.children; });
                rootNode.x0 = 0;
                rootNode.y0 = height/2;
                var i = 0;
                var duration = 750;

                update(rootNode);

                function update(source) {

                    var treeData = treemap(rootNode);

                    // Compute the new tree layout.
                    var nodes = treeData.descendants(),
                        links = treeData.descendants().slice(1);
                  
                    // Normalize for fixed-depth.
                    nodes.forEach(function(d){ d.y = d.depth * 180});
                  
                
                    // ***************** Nodes section ***************************
                
                    // Each node as an object with data and position
                    var node = svg.selectAll('g.node')
                        .data(nodes, function(d) {return d.id || (d.id = ++i); });
                
                    // Enter any new nodes at the parent's previous position.
                    var nodeEnter = node.enter().append('g')
                        .attr('class', 'node')
                        .attr("transform", function(d) { 
                            return "translate(" + source.x0 + "," + source.y0 + ")";
                        });
                
                    // Add Circle for the nodes
                    nodeEnter.append('circle')
                        .attr('class', 'node')
                        .attr('r', 15) // radius of the circle
                        // .style("fill", "rgb(255,0,0)")
                        .style("fill", function(d) {return getNodeColor(d.data.data.name)});

                    function getNodeColor(d){
                        if (correctSubtopics.has(d)) {
                            return "rgba(0,255,0,0.8)"
                        }
                        if (incorrectSubtopics.has(d)) {
                            return "rgba(255,0,0,0.8)"
                        }
                        else {
                            return "rgba(50,50,50,0.8)"
                        }
                    }
                
                    // ***************** Links section ***************************
                    // Update the links...
                    var link = svg.selectAll('path.link')
                        .data(links, function(d) { return d.id; });

                    // Enter any new links at the parent's previous position.
                    var linkEnter = link.enter().insert('path', "g")
                        .attr("class", "link")
                        .style("stroke", "rgba(50,50,50,0.7)") // Stroke style: color
                        .style("stroke-width", "1.5px") // Stroke style: width
                        .attr('d', function(d) {
                            var o = {x: d.x, y: d.y};
                            return diagonal(o, o);
                        });
                
                    // Update the positions of both nodes and links
                    var t = d3.transition().duration(duration);
                    
                    nodeEnter.transition(t)
                        .attr("transform", function(d) { 
                            return "translate(" + d.x + "," + d.y + ")";
                        });
                
                    node.transition(t)
                        .attr("transform", function(d) { 
                            return "translate(" + d.x + "," + d.y + ")";
                        });
                
                    linkEnter.transition(t)
                        .attr('d', function(d){return diagonal(d, d.parent) });
                
                    // Stash the old positions for transition.
                    nodes.forEach(function(d){
                        d.x0 = d.x;
                        d.y0 = d.y;
                    });

                    // Add labels for the nodes
                    nodeEnter.append('text')
                            .attr("dy", "2.5em") // Offset the text below the node
                            .attr("x", "-3.5em") // Center the text under the node
                            .attr("text-anchor", "middle") // Center the text horizontally
                            .style("fill", "rgb(0,0,0)")
                            .text(function(d) { return d.data.data.name; })
                            .attr("transform", function(d) {
                                // Optionally, adjust the rotation if needed
                                // Here, a slight rotation of -45 degrees is applied
                                return "rotate(-45)";
                            });
                
                
                    // Creates a curved (diagonal) path from parent to the child nodes
                    function diagonal(s, d) {
                        var path = `M ${s.x} ${s.y} L ${d.x} ${d.y}`;
                        return path
                    }
                }

                const colorLegend = [
                    { color: "rgba(0,255,0,0.8)", label: "Strengths" },
                    { color: "rgba(255,0,0,0.8)", label: "Areas for Improvement" },
                    { color: "rgba(50,50,50,0.8)", label: "To Be Explored" }
                ];

                var legend = svg.append('g')
                .attr('class', 'legend')
                .attr('transform', 'translate(' + (width - margin.right) + ', 0)'); // position top right

                // Add legend items
                colorLegend.forEach(function(legendItem, index) {
                var legendGroup = legend.append('g')
                    .attr('class', 'legend-item')
                    .attr('transform', 'translate(0, ' + (index * 40) + ')'); // position each item 20px apart

                // Add the colored circle
                legendGroup.append('circle')
                    .attr('r', 15) // radius of the circle in the legend
                    .attr('fill', legendItem.color)
                    .attr('cx', 0)
                    .attr('cy', 15); // Adjust vertical position to align with the text

                // Add the label text
                legendGroup.append('text')
                    .attr('x', 25) // Position text to the right of the circle
                    .attr('y', 15) // Adjust vertical position
                    .text(legendItem.label)
                    .attr('alignment-baseline', 'middle');
                });
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });

        examContent.appendChild(createTreeButton);

        document.getElementById('loadingIndicator').style.display = 'none';
    })
    .catch((error) => {
        console.error('Error:', error);
        document.getElementById('loadingIndicator').style.display = 'none';
    });
});
