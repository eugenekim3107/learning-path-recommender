from openai import OpenAI
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
import json
from typing import List

seed = 0
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],  # Allows requests from your frontend origin
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class ExamRequest(BaseModel):
    topic: str

class Subtopic(BaseModel):
    name: str
    answers: List[bool]

class responseData(BaseModel):
    mainTopic: str
    subtopics: List[Subtopic]

@app.post("/create_exam")
async def create_exam(request: ExamRequest):
    client = OpenAI()
    # assistant_content = f"I am creating a topic learning tree with {request.topic} as the main node with a tree depth of at least 3. The branches of this tree extend into various subtopics, each represented as individual nodes. We will create this using an exam."
    question_content = f"""
                        Create a short exam with exactly 10 multiple-choice questions on the topic: {request.topic}. The content of the questions should be subtopics of {request.topic} and even subtopics of the subtopic. The response to my prompt should be in the following format:

                        {{
                            "exam1": {{
                                "question_statement": "Place your question here",
                                "options": ["Option A", "Option B", "Option C", "Option D"]
                            }},
                            "answer1": {{
                                "question_statement": "Correct answer"
                            }},
                            "subtopic1": {{
                                "question_statement": "Relevant subtopic of the question"
                            }}
                        }}

                        For example, if the question is about the cause of World War II, format it like this:

                        {{
                            "exam1": {{
                                "question_statement": "What was the primary cause of World War II?",
                                "options": ["Option A: Political Tensions", "Option B: Economic Crisis", "Option C: Assassination of a key figure", "Option D: Natural Disaster"]
                            }},
                            "answer1": {{
                                "question_statement": "Option A: Political Tensions"
                            }},
                            "subtopic1": {{
                                "question_statement": "World War II Causes"
                            }}
                        }}
                        """

    response = client.chat.completions.create(
        model="gpt-3.5-turbo-1106",
        messages=[
            # {"role":"assistant", "content": assistant_content},
            {"role":"user", "content": question_content}
        ],
        seed=seed
    )

    gpt_response = response.choices[0].message.content
    print(gpt_response)

    return {"exam": gpt_response}

@app.post("/generate_learning_tree")
async def generate_learning_tree(request: responseData):
    client = OpenAI()
    main_topic = request.mainTopic
    subtopics = [subtopic.name for subtopic in request.subtopics]
    formatted_subtopics = ', '.join([f"'{subtopic}'" for subtopic in subtopics])

    # Create the prompt
    question_content = f"""
    Create a tree structure for the main topic of {main_topic} with a minimum depth of 3 levels. Under the main topic, include the following categories and the overarching categories as provided in the 'sub_topics' input:
    {formatted_subtopics}. The output format must be in json format as follows:
    {{name: mainTopicName, children: [{{name: subtopic1, children: [{{name: subsubtopic1}}, {{name: subsubtopic2}}]}}]}}
    """

    response = client.chat.completions.create(
        model="gpt-3.5-turbo-1106",
        messages=[
            {"role":"user", "content": question_content}
        ],
        seed=seed
    )

    gpt_response = response.choices[0].message.content
    return {"tree": gpt_response}

def create_node():
    pass

def create_tree():
    pass

if __name__ == "__main__":
    uvicorn.run(app, host='127.0.0.1', port=8000)