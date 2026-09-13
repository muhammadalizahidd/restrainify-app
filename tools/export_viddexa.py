#!/usr/bin/env python3
"""Export and verify Viddexa NSFW Detection 2 Nano for Restrainify Android."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

MODEL_ID = "viddexa/nsfw-detection-2-nano"
EXPECTED_LABELS = {0: "safe", 1: "hentai", 2: "porn", 3: "sexy", 4: "drawing"}


def dependencies():
    try:
        import onnx  # noqa: F401
        import onnxruntime  # noqa: F401
        import torch  # noqa: F401
        from transformers import AutoImageProcessor, AutoModelForImageClassification  # noqa: F401
    except ImportError as error:
        raise SystemExit("Install dependencies: python -m pip install torch transformers onnx onnxruntime pillow") from error


def manifest(processor, model_asset: str) -> dict[str, object]:
    if not all((processor.do_resize, processor.do_rescale, processor.do_normalize)):
        raise RuntimeError("Unexpected Viddexa image processor contract.")
    size, crop = processor.size, processor.crop_size
    if not all((size.get("width"), size.get("height"))):
        raise RuntimeError(f"Unsupported dimensions: size={size}, crop={crop}")
    crop = crop if processor.do_center_crop else size
    return {"modelAsset": model_asset, "resize": {"width": size["width"], "height": size["height"]}, "centerCrop": {"enabled": processor.do_center_crop, "width": crop["width"], "height": crop["height"]}, "rescaleFactor": processor.rescale_factor, "imageMean": processor.image_mean, "imageStd": processor.image_std}


def export(output: Path):
    dependencies()
    import onnx
    import torch
    from transformers import AutoImageProcessor, AutoModelForImageClassification

    output.mkdir(parents=True, exist_ok=True)
    processor = AutoImageProcessor.from_pretrained(MODEL_ID, use_fast=False)
    model = AutoModelForImageClassification.from_pretrained(MODEL_ID).eval()
    labels = {int(key): value for key, value in model.config.id2label.items()}
    if labels != EXPECTED_LABELS:
        raise RuntimeError(f"Unexpected Viddexa labels: {labels}")
    data = manifest(processor, "models/viddexa_nsfw_2_nano.onnx")
    crop = data["centerCrop"]
    onnx_path = output / "viddexa_nsfw_2_nano.onnx"
    torch.onnx.export(model, torch.zeros((1, 3, crop["height"], crop["width"]), dtype=torch.float32), onnx_path, input_names=["pixel_values"], output_names=["logits"], opset_version=17, dynamo=False)
    onnx.checker.check_model(str(onnx_path))
    data["sha256"] = hashlib.sha256(onnx_path.read_bytes()).hexdigest()
    (output / "viddexa_nsfw_2_nano_manifest.json").write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Exported {onnx_path} ({onnx_path.stat().st_size} bytes)")


def verify(directory: Path, image: Path):
    dependencies()
    import numpy as np
    import onnxruntime as ort
    import torch
    from PIL import Image
    from transformers import AutoImageProcessor, AutoModelForImageClassification

    processor = AutoImageProcessor.from_pretrained(MODEL_ID, use_fast=False)
    model = AutoModelForImageClassification.from_pretrained(MODEL_ID).eval()
    inputs = processor(images=Image.open(image).convert("RGB"), return_tensors="pt")
    with torch.no_grad(): pytorch = torch.softmax(model(**inputs).logits, dim=-1).numpy()[0]
    session = ort.InferenceSession(str(directory / "viddexa_nsfw_2_nano.onnx"), providers=["CPUExecutionProvider"])
    onnx_scores = session.run(None, {"pixel_values": inputs["pixel_values"].numpy()})[0][0]
    onnx_scores = np.exp(onnx_scores - np.max(onnx_scores)); onnx_scores /= onnx_scores.sum()
    delta = float(np.max(np.abs(pytorch - onnx_scores)))
    print(json.dumps({"pytorch": pytorch.tolist(), "onnx": onnx_scores.tolist(), "maxAbsDifference": delta}, indent=2))
    if delta > 1e-4: raise SystemExit("Parity failure: maximum probability difference exceeds 1e-4.")


def main():
    parser = argparse.ArgumentParser(); commands = parser.add_subparsers(dest="command", required=True)
    first = commands.add_parser("export"); first.add_argument("--output", type=Path, required=True)
    second = commands.add_parser("verify"); second.add_argument("--model-directory", type=Path, required=True); second.add_argument("--image", type=Path, required=True)
    args = parser.parse_args()
    export(args.output) if args.command == "export" else verify(args.model_directory, args.image)


if __name__ == "__main__": main()
