import json
import logging
import coloredlogs

coloredlogs.install(
    level="INFO",
    fmt="%(asctime)s %(name)s %(funcName)s() %(filename)s"
    "%(lineno)d %(levelname)-8s %(message)s",
)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _marshal_llm_to_json(output: str) -> str:
    """Modified version of LlamaIndex's _marshal_llm_to_json.
    Extract a substring containing valid JSON or array from a string.

    Args:
        output: A string that may contain a valid JSON
        object or array surrounded by extraneous characters or information.

    Returns:
        A string containing a valid JSON object or array.
    """
    output = output.strip().replace("{{", "{").replace("}}", "}")

    left_square = output.find("[")
    left_brace = output.find("{")

    if left_square < left_brace and left_square != -1:
        left = left_square
        right = output.find("]")
    else:
        left = left_brace
        right = output.rfind("}")

    return output[left : right + 1]


def parse_json(json_string: str):
    """parse output of _marshal_llm_to_json to json object"""
    try:
        logger.info(f"json_string = {json_string}")
        json_obj = json.loads(json_string)
    except json.JSONDecodeError:
        try:
            import yaml

            # NOTE: parsing again with pyyaml
            #       pyyaml is less strict, and allows for trailing commas
            #       right now we rely on this since guidance program generates
            #       trailing commas
            json_obj = yaml.safe_load(json_string)
        except yaml.YAMLError as e_yaml:
            raise ValueError(e_yaml)
        except NameError as exc:
            raise ImportError("Please pip install PyYAML.") from exc
    return json_obj
