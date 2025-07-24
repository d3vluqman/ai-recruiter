import pytest
import io
from unittest.mock import Mock, patch, AsyncMock
from fastapi import UploadFile
from services.document_processor import DocumentProcessor


class TestDocumentProcessor:

    def setup_method(self):
        """Set up test fixtures"""
        self.processor = DocumentProcessor()

    def test_init(self):
        """Test DocumentProcessor initialization"""
        assert self.processor.supported_formats == [".pdf", ".doc", ".docx", ".txt"]

    def test_get_file_extension(self):
        """Test file extension extraction"""
        assert self.processor._get_file_extension("resume.pdf") == ".pdf"
        assert self.processor._get_file_extension("document.DOCX") == ".docx"
        assert self.processor._get_file_extension("file.txt") == ".txt"
        assert self.processor._get_file_extension("noextension") == ""

    def test_get_file_extension_invalid(self):
        """Test file extension extraction with invalid input"""
        with pytest.raises(ValueError, match="Filename is required"):
            self.processor._get_file_extension("")

        with pytest.raises(ValueError, match="Filename is required"):
            self.processor._get_file_extension(None)

    def test_clean_text(self):
        """Test text cleaning functionality"""
        dirty_text = "This   has    multiple\n\n\nspaces\tand\ttabs"
        cleaned = self.processor._clean_text(dirty_text)
        assert "multiple spaces" in cleaned
        assert "\t" not in cleaned
        assert "\n\n\n" not in cleaned

    def test_clean_text_special_characters(self):
        """Test cleaning of special characters"""
        text_with_special = "Text with @#$%^&*() special chars"
        cleaned = self.processor._clean_text(text_with_special)
        # Should preserve some special characters but clean others
        assert "Text with" in cleaned
        assert len(cleaned) > 0

    def test_clean_text_empty(self):
        """Test cleaning empty text"""
        assert self.processor._clean_text("") == ""
        assert self.processor._clean_text(None) == ""
        assert self.processor._clean_text("   ") == ""

    def test_validate_extracted_text_valid(self):
        """Test text validation with valid text"""
        valid_text = "This is a valid resume with enough meaningful content to pass validation checks."
        assert self.processor.validate_extracted_text(valid_text) == True

    def test_validate_extracted_text_too_short(self):
        """Test text validation with too short text"""
        short_text = "Too short"
        assert self.processor.validate_extracted_text(short_text) == False

    def test_validate_extracted_text_no_meaningful_content(self):
        """Test text validation with no meaningful content"""
        meaningless_text = "!@#$%^&*()_+{}|:<>?[]\\;'\",./"
        assert self.processor.validate_extracted_text(meaningless_text) == False

    def test_extract_from_txt_utf8(self):
        """Test TXT extraction with UTF-8 encoding"""
        text_content = "This is a test document with UTF-8 content."
        content_bytes = text_content.encode("utf-8")

        result = self.processor._extract_from_txt(content_bytes)
        assert "test document" in result
        assert len(result) > 0

    def test_extract_from_txt_latin1(self):
        """Test TXT extraction with Latin-1 encoding"""
        text_content = "This is a test document with special chars: café"
        content_bytes = text_content.encode("latin-1")

        result = self.processor._extract_from_txt(content_bytes)
        assert "test document" in result

    def test_extract_from_txt_invalid_encoding(self):
        """Test TXT extraction with invalid bytes"""
        invalid_bytes = b"\x80\x81\x82\x83"

        # Should not raise exception, should handle gracefully
        result = self.processor._extract_from_txt(invalid_bytes)
        assert isinstance(result, str)

    @patch("PyPDF2.PdfReader")
    @patch("pdfplumber.open")
    def test_extract_from_pdf_success(self, mock_pdfplumber, mock_pypdf2):
        """Test successful PDF extraction"""
        # Mock pdfplumber
        mock_page = Mock()
        mock_page.extract_text.return_value = "This is extracted PDF text content."
        mock_pdf = Mock()
        mock_pdf.pages = [mock_page]
        mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

        content_bytes = b"fake pdf content"
        result = self.processor._extract_from_pdf(content_bytes)

        assert "extracted PDF text" in result
        mock_pdfplumber.assert_called_once()

    @patch("PyPDF2.PdfReader")
    @patch("pdfplumber.open")
    def test_extract_from_pdf_fallback_to_pypdf2(self, mock_pdfplumber, mock_pypdf2):
        """Test PDF extraction fallback to PyPDF2"""
        # Mock pdfplumber to return minimal text
        mock_page_plumber = Mock()
        mock_page_plumber.extract_text.return_value = "short"
        mock_pdf_plumber = Mock()
        mock_pdf_plumber.pages = [mock_page_plumber]
        mock_pdfplumber.return_value.__enter__.return_value = mock_pdf_plumber

        # Mock PyPDF2
        mock_page_pypdf2 = Mock()
        mock_page_pypdf2.extract_text.return_value = (
            "This is a longer text extracted by PyPDF2 with more content."
        )
        mock_reader = Mock()
        mock_reader.pages = [mock_page_pypdf2]
        mock_pypdf2.return_value = mock_reader

        content_bytes = b"fake pdf content"
        result = self.processor._extract_from_pdf(content_bytes)

        assert "PyPDF2" in result
        assert len(result) > 100

    @patch("PyPDF2.PdfReader")
    @patch("pdfplumber.open")
    def test_extract_from_pdf_both_methods_fail(self, mock_pdfplumber, mock_pypdf2):
        """Test PDF extraction when both methods fail"""
        # Mock both methods to raise exceptions
        mock_pdfplumber.side_effect = Exception("pdfplumber failed")
        mock_pypdf2.side_effect = Exception("PyPDF2 failed")

        content_bytes = b"fake pdf content"

        with pytest.raises(Exception, match="Failed to extract text from PDF"):
            self.processor._extract_from_pdf(content_bytes)

    @patch("docx.Document")
    def test_extract_from_docx_success(self, mock_document):
        """Test successful DOCX extraction"""
        # Mock paragraphs
        mock_paragraph1 = Mock()
        mock_paragraph1.text = "First paragraph text"
        mock_paragraph2 = Mock()
        mock_paragraph2.text = "Second paragraph text"

        # Mock table
        mock_cell = Mock()
        mock_cell.text = "Table cell content"
        mock_row = Mock()
        mock_row.cells = [mock_cell]
        mock_table = Mock()
        mock_table.rows = [mock_row]

        # Mock document
        mock_doc = Mock()
        mock_doc.paragraphs = [mock_paragraph1, mock_paragraph2]
        mock_doc.tables = [mock_table]
        mock_document.return_value = mock_doc

        content_bytes = b"fake docx content"
        result = self.processor._extract_from_docx(content_bytes)

        assert "First paragraph" in result
        assert "Second paragraph" in result
        assert "Table cell" in result

    @patch("docx.Document")
    def test_extract_from_docx_failure(self, mock_document):
        """Test DOCX extraction failure"""
        mock_document.side_effect = Exception("DOCX parsing failed")

        content_bytes = b"fake docx content"

        with pytest.raises(Exception, match="Failed to extract text from DOCX file"):
            self.processor._extract_from_docx(content_bytes)

    @pytest.mark.asyncio
    async def test_extract_text_from_file_pdf(self):
        """Test file extraction for PDF"""
        # Create mock UploadFile
        mock_file = Mock(spec=UploadFile)
        mock_file.filename = "test.pdf"
        mock_file.read = AsyncMock(return_value=b"fake pdf content")
        mock_file.seek = AsyncMock()

        # Mock the PDF extraction method
        with patch.object(
            self.processor, "_extract_from_pdf", return_value="Extracted PDF text"
        ):
            result = await self.processor.extract_text_from_file(mock_file)
            assert result == "Extracted PDF text"

    @pytest.mark.asyncio
    async def test_extract_text_from_file_docx(self):
        """Test file extraction for DOCX"""
        mock_file = Mock(spec=UploadFile)
        mock_file.filename = "test.docx"
        mock_file.read = AsyncMock(return_value=b"fake docx content")
        mock_file.seek = AsyncMock()

        with patch.object(
            self.processor, "_extract_from_docx", return_value="Extracted DOCX text"
        ):
            result = await self.processor.extract_text_from_file(mock_file)
            assert result == "Extracted DOCX text"

    @pytest.mark.asyncio
    async def test_extract_text_from_file_txt(self):
        """Test file extraction for TXT"""
        mock_file = Mock(spec=UploadFile)
        mock_file.filename = "test.txt"
        mock_file.read = AsyncMock(return_value=b"This is plain text content")
        mock_file.seek = AsyncMock()

        result = await self.processor.extract_text_from_file(mock_file)
        assert "plain text content" in result

    @pytest.mark.asyncio
    async def test_extract_text_from_file_unsupported_format(self):
        """Test file extraction with unsupported format"""
        mock_file = Mock(spec=UploadFile)
        mock_file.filename = "test.xyz"
        mock_file.read = AsyncMock(return_value=b"content")
        mock_file.seek = AsyncMock()

        with pytest.raises(ValueError, match="Unsupported file format"):
            await self.processor.extract_text_from_file(mock_file)

    @pytest.mark.asyncio
    async def test_extract_text_from_file_extraction_failure(self):
        """Test file extraction when extraction method fails"""
        mock_file = Mock(spec=UploadFile)
        mock_file.filename = "test.pdf"
        mock_file.read = AsyncMock(return_value=b"fake pdf content")
        mock_file.seek = AsyncMock()

        with patch.object(
            self.processor,
            "_extract_from_pdf",
            side_effect=Exception("Extraction failed"),
        ):
            with pytest.raises(Exception, match="Text extraction failed"):
                await self.processor.extract_text_from_file(mock_file)
