
from pydantic import BaseModel, Field
class SQLQueryInput(BaseModel):
    """Input schema for SQL query tool."""
    sql: str = Field(description="The SQL query to execute")
    reasoning: str = Field(description="The reasoning behind this SQL query")

class ProjectSearchInput(BaseModel):
    """Input schema for project search tool."""
    project_name: str = Field(description="The project name to search for")

class NLQueryInput(BaseModel):
    """Input schema for natural language to SQL conversion."""
    query: str = Field(description="The natural language query to convert to SQL")
