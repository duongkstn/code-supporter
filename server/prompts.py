# Technique: Chain-of-thought prompting
prompt_answer = """
You are a great programmer.

{query}

Think step-by-step.
"""

# Technique: Few-shot prompting
prompt_feedback = """I have a feedback . If the feedback is good, skip it, else extract following information if possible:
{{
    "feedback": the summarised feedback in short and formal style
}}
NOTE: make it readable

Input feedback: Too dumb !
Output:
{{
    "feedback": "Your answer is bad. please answer more carefully"
}}

Input feedback: No, I do not want that, please write code in C++
Output:
{{
    "feedback": "write code in C++"
}}

Input feedback: {feedback}
Output:
"""
